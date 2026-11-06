-- HC-E (PO 2026-10-29): CẤM sửa số tồn kho hóa chất. Tồn chỉ đổi bằng phiếu Nhập / Xuất có duyệt.
-- Quyết định PO (đã chốt):
--  1. Không tạo mới DIEU_CHINH (chặn ở RPC + CHECK NOT VALID). Dòng DIEU_CHINH cũ giữ nguyên làm lịch sử,
--     vẫn tính tồn; không xóa, không đổi.
--  2. Phiếu XUAT bắt buộc lý do: CAP_SU_DUNG | HET_HAN_HUY | VO_HONG | THAT_THOAT | KIEM_KE_THIEU.
--     Dòng XUAT cũ không backfill (CHECK NOT VALID).
--  3. Lô quá hạn chỉ xuất được với lý do HET_HAN_HUY (kể cả lúc duyệt); HET_HAN_HUY trên lô còn hạn bị chặn.
-- Ghi chú: CHECK NOT VALID vẫn kiểm khi UPDATE dòng cũ → phiếu XUAT CHO_DUYET tạo trước HC-E (ly_do_xuat NULL)
--   sẽ không duyệt/từ chối được; kiểm số phiếu này trước khi apply prod (SQL cuối file).
-- Không BEGIN/COMMIT trong file: db push tự bọc transaction.

-- 1) Cột lý do xuất (additive, NULL).
ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS ly_do_xuat varchar(24);

COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.ly_do_xuat IS
  'HC-E: lý do xuất (bắt buộc với XUAT mới): CAP_SU_DUNG | HET_HAN_HUY | VO_HONG | THAT_THOAT | KIEM_KE_THIEU. NULL với NHAP và dòng cũ.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_ly_do_xuat_check') THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_ly_do_xuat_check
      CHECK (ly_do_xuat IS NULL
             OR ly_do_xuat IN ('CAP_SU_DUNG', 'HET_HAN_HUY', 'VO_HONG', 'THAT_THOAT', 'KIEM_KE_THIEU'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_xuat_can_ly_do_check') THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_xuat_can_ly_do_check
      CHECK (loai_giao_dich <> 'XUAT' OR ly_do_xuat IS NOT NULL) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_cam_dieu_chinh_check') THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_cam_dieu_chinh_check
      CHECK (loai_giao_dich <> 'DIEU_CHINH') NOT VALID;
  END IF;
END $$;

-- 2) RPC tạo phiếu: thêm p_ly_do_xuat (DEFAULT NULL). Bỏ chữ ký cũ để không còn đường ghi thiếu lý do.
--    NHAP/XUAT → CHO_DUYET (không đổi tồn). DIEU_CHINH bị từ chối (HC-E).
--    Kiểm tồn khi lập xuất: tồn đã duyệt trừ các phiếu xuất đang chờ cùng lô (tránh hứa vượt tồn).
DROP FUNCTION IF EXISTS public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(
  p_loai text,
  p_dm_hoa_chat_id uuid,
  p_so_luong numeric,
  p_ma_lo text,
  p_han_su_dung date,
  p_ghi_chu text,
  p_su_co_id uuid,
  p_actor_user_id uuid,
  p_ma_phieu text,
  p_ly_do_xuat text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_loai text := upper(btrim(coalesce(p_loai, '')));
  v_ma_lo text := nullif(btrim(coalesce(p_ma_lo, '')), '');
  v_ly_do text := nullif(upper(btrim(coalesce(p_ly_do_xuat, ''))), '');
  v_delta numeric;
  v_ton numeric;
  v_ns uuid;
  v_ma text;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_qua_han boolean := p_han_su_dung IS NOT NULL AND p_han_su_dung < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_loai = 'DIEU_CHINH' THEN
    RAISE EXCEPTION 'Không được sửa số tồn. Dùng phiếu Nhập hoặc Xuất có lý do.';
  END IF;
  IF v_loai NOT IN ('NHAP', 'XUAT') THEN
    RAISE EXCEPTION 'Loại giao dịch không hợp lệ.';
  END IF;
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người lập phiếu.';
  END IF;
  IF p_dm_hoa_chat_id IS NULL THEN
    RAISE EXCEPTION 'Chọn hóa chất.';
  END IF;
  IF p_so_luong IS NULL OR p_so_luong <= 0 THEN
    RAISE EXCEPTION 'Số lượng % phải > 0.', CASE WHEN v_loai = 'NHAP' THEN 'nhập' ELSE 'xuất' END;
  END IF;

  IF v_loai = 'NHAP' THEN
    v_ly_do := NULL;  -- phiếu nhập không có lý do xuất
  ELSE
    IF v_ly_do IS NULL THEN
      RAISE EXCEPTION 'Chọn lý do xuất.';
    END IF;
    IF v_ly_do NOT IN ('CAP_SU_DUNG', 'HET_HAN_HUY', 'VO_HONG', 'THAT_THOAT', 'KIEM_KE_THIEU') THEN
      RAISE EXCEPTION 'Lý do xuất không hợp lệ.';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || p_dm_hoa_chat_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.cssd_dm_hoa_chat WHERE id = p_dm_hoa_chat_id) THEN
    RAISE EXCEPTION 'Không tìm thấy hóa chất.';
  END IF;

  v_delta := CASE v_loai WHEN 'XUAT' THEN -p_so_luong ELSE p_so_luong END;

  IF v_delta < 0 THEN
    IF v_qua_han AND v_ly_do <> 'HET_HAN_HUY' THEN
      RAISE EXCEPTION 'Không xuất lô đã quá hạn sử dụng. Chọn lý do «Hết hạn – hủy» để xuất hủy lô này.';
    END IF;
    IF NOT v_qua_han AND v_ly_do = 'HET_HAN_HUY' THEN
      RAISE EXCEPTION 'Lý do «Hết hạn – hủy» chỉ dùng cho lô đã quá hạn sử dụng (lô này còn hạn hoặc không có hạn).';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = p_dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND ma_lo IS NOT DISTINCT FROM v_ma_lo
       AND han_su_dung IS NOT DISTINCT FROM p_han_su_dung
       AND (trang_thai = 'DA_DUYET' OR (trang_thai = 'CHO_DUYET' AND so_luong_co_dau < 0));
    IF v_ton + v_delta < 0 THEN
      RAISE EXCEPTION 'Không đủ tồn tại lô đã chọn (tồn khả dụng %, cần %).', v_ton, p_so_luong;
    END IF;
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := coalesce(
    nullif(btrim(p_ma_phieu), ''),
    CASE v_loai WHEN 'NHAP' THEN 'NK' ELSE 'XK' END || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_by, trang_thai, ly_do_xuat, updated_at
  ) VALUES (
    v_ma, p_dm_hoa_chat_id, v_loai, v_delta, v_ma_lo, p_han_su_dung,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), p_su_co_id, v_ns, p_actor_user_id, 'CHO_DUYET', v_ly_do, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text, uuid, numeric, text, date, text, uuid, uuid, text, text)
  TO service_role;

-- 3) RPC duyệt / từ chối nguyên tử — giữ nguyên chữ ký và mọi kiểm; chỉ bỏ kiểm quá hạn khi ly_do_xuat = HET_HAN_HUY.
--    Thứ tự khóa = advisory theo hóa chất (giống RPC ghi) → FOR UPDATE dòng phiếu; chặn xử lý lại.
CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(
  p_giao_dich_id uuid,
  p_quyet_dinh text,
  p_ly_do text,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_qd text := upper(btrim(coalesce(p_quyet_dinh, '')));
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
  v_dm uuid;
  r public.cssd_fact_kho_hoa_chat_giao_dich%ROWTYPE;
  v_ton numeric;
  v_ngoai_le boolean := false;
  v_new text;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF v_qd NOT IN ('DUYET', 'TU_CHOI') THEN
    RAISE EXCEPTION 'Quyết định không hợp lệ (DUYET | TU_CHOI).';
  END IF;
  IF v_qd = 'TU_CHOI' AND v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Nhập lý do từ chối.';
  END IF;
  IF p_giao_dich_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu phiếu cần duyệt.';
  END IF;
  IF NOT public.fn_cssd_hoa_chat_is_approver(p_actor_user_id) THEN
    RAISE EXCEPTION 'Bạn không có quyền duyệt phiếu kho hóa chất (CSSD_HOA_CHAT.approve).';
  END IF;

  SELECT dm_hoa_chat_id INTO v_dm FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_giao_dich_id;
  IF v_dm IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || v_dm::text, 0));

  SELECT * INTO r FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_giao_dich_id FOR UPDATE;
  IF NOT COALESCE(r.is_active, true) THEN
    RAISE EXCEPTION 'Phiếu đã bị hủy.';
  END IF;
  IF r.trang_thai <> 'CHO_DUYET' THEN
    RAISE EXCEPTION 'Phiếu % đã được xử lý (%), không duyệt lại.', r.ma_phieu, r.trang_thai;
  END IF;

  IF r.created_by IS NOT DISTINCT FROM p_actor_user_id THEN
    IF public.fn_cssd_hoa_chat_approver_count() = 1 THEN
      v_ngoai_le := true;
    ELSE
      RAISE EXCEPTION 'Người duyệt phải khác người lập phiếu — nhờ người khác có quyền duyệt.';
    END IF;
  END IF;

  IF v_qd = 'DUYET' AND r.so_luong_co_dau < 0 THEN
    IF r.han_su_dung IS NOT NULL AND r.han_su_dung < v_today
       AND r.ly_do_xuat IS DISTINCT FROM 'HET_HAN_HUY' THEN
      RAISE EXCEPTION 'Lô đã quá hạn sử dụng tại lúc duyệt — từ chối phiếu và lập phiếu xuất lý do «Hết hạn – hủy».';
    END IF;
    SELECT COALESCE(SUM(so_luong_co_dau), 0) INTO v_ton
      FROM public.cssd_fact_kho_hoa_chat_giao_dich
     WHERE dm_hoa_chat_id = r.dm_hoa_chat_id
       AND COALESCE(is_active, true)
       AND trang_thai = 'DA_DUYET'
       AND ma_lo IS NOT DISTINCT FROM r.ma_lo
       AND han_su_dung IS NOT DISTINCT FROM r.han_su_dung;
    IF v_ton + r.so_luong_co_dau < 0 THEN
      RAISE EXCEPTION 'Không đủ tồn lô tại lúc duyệt (tồn %, cần %).', v_ton, -r.so_luong_co_dau;
    END IF;
  END IF;

  v_new := CASE v_qd WHEN 'DUYET' THEN 'DA_DUYET' ELSE 'TU_CHOI' END;
  UPDATE public.cssd_fact_kho_hoa_chat_giao_dich
     SET trang_thai = v_new,
         nguoi_duyet_id = p_actor_user_id,
         duyet_at = now(),
         ly_do_tu_choi = CASE WHEN v_new = 'TU_CHOI' THEN v_ly_do ELSE NULL END,
         tu_duyet_ngoai_le = v_ngoai_le,
         updated_at = now()
   WHERE id = r.id;

  RETURN jsonb_build_object('id', r.id, 'ma_phieu', r.ma_phieu, 'trang_thai', v_new, 'tu_duyet_ngoai_le', v_ngoai_le);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_duyet_phieu(uuid, text, text, uuid) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), chạy trước khi apply:
--   SELECT dm_hoa_chat_id, ma_lo, han_su_dung, ton_so_luong FROM public.v_cssd_kho_hoa_chat_ton_lo ORDER BY 1,2,3;  -- lưu để so sau apply
--   SELECT loai_giao_dich, trang_thai, count(*) FROM public.cssd_fact_kho_hoa_chat_giao_dich GROUP BY 1,2 ORDER BY 1,2;
--   -- Kỳ vọng 0: phiếu chờ duyệt sẽ kẹt vì CHECK NOT VALID kiểm khi UPDATE (XUAT thiếu lý do / DIEU_CHINH).
--   SELECT count(*) FROM public.cssd_fact_kho_hoa_chat_giao_dich
--    WHERE trang_thai = 'CHO_DUYET' AND loai_giao_dich IN ('XUAT', 'DIEU_CHINH');
--   SELECT oid::regprocedure FROM pg_proc WHERE proname = 'rpc_cssd_kho_hoa_chat_ghi_giao_dich';  -- kỳ vọng chữ ký 9 tham số
