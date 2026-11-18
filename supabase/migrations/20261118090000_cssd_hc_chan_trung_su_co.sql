-- CSSD-032: chặn lập phiếu XUẤT kho hóa chất thứ hai cho cùng một sự cố (bấm đúp / gọi lại lọt vì UI chỉ chặn ở client).
-- Chỉ thêm một khối kiểm vào rpc_cssd_kho_hoa_chat_ghi_giao_dich; mọi logic khác giữ nguyên bản
-- 20261029130000_cssd_hc_e_cam_sua_ton_ly_do_xuat.sql (đã đối chiếu pg_get_functiondef local: trùng khớp).
-- Vị từ «phiếu hiệu lực» chép nguyên từ app (sự cố đã liên kết phiếu):
--   su_co_id = <id> AND is_active = true AND trang_thai <> 'TU_CHOI', KHÔNG lọc loai_giao_dich
--   (src/modules/cssd-erp/actions/cssd-kho-hoa-chat-su-co.actions.ts:56-62,
--    src/modules/cssd-su-co/application/void-incident.application.ts:51-56).
--   trang_thai NOT NULL nên "<>" không bỏ sót NULL.
-- Phạm vi: chỉ chặn khi p_loai = XUAT và p_su_co_id IS NOT NULL. Phiếu NHẬP không mang su_co_id qua app
--   (nhapKhoHoaChatAction không có su_co_id; cssd-lifecycle truyền NULL), nên không cần chặn NHẬP.
-- Khóa: hóa chất trước (khóa sẵn có), sự cố sau — giữ thứ tự cố định để không deadlock.
-- Không unique index (chưa biết dữ liệu trùng trên prod). Không đổi chữ ký, quyền giữ nguyên.
-- Không BEGIN/COMMIT trong file: db push tự bọc transaction.

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(p_loai text, p_dm_hoa_chat_id uuid, p_so_luong numeric, p_ma_lo text, p_han_su_dung date, p_ghi_chu text, p_su_co_id uuid, p_actor_user_id uuid, p_ma_phieu text, p_ly_do_xuat text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  IF p_su_co_id IS NOT NULL AND v_loai = 'XUAT' THEN
    -- CSSD-032: tuần tự hóa theo sự cố rồi mới kiểm, để hai lời gọi đồng thời không cùng lọt.
    PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat_su_co:' || p_su_co_id::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
       WHERE g.su_co_id = p_su_co_id
         AND g.is_active = true
         AND g.trang_thai <> 'TU_CHOI'
    ) THEN
      RAISE EXCEPTION 'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
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

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), chạy trước khi apply — đếm sự cố đã có > 1 phiếu hiệu lực (dữ liệu trùng cũ, migration KHÔNG dọn;
-- các sự cố này sẽ không lập thêm phiếu XUẤT được cho đến khi phiếu thừa bị từ chối/vô hiệu):
--   SELECT su_co_id, count(*), array_agg(ma_phieu ORDER BY created_at)
--     FROM public.cssd_fact_kho_hoa_chat_giao_dich
--    WHERE su_co_id IS NOT NULL AND is_active = true AND trang_thai <> 'TU_CHOI'
--    GROUP BY su_co_id HAVING count(*) > 1;
--   SELECT oid::regprocedure FROM pg_proc WHERE proname = 'rpc_cssd_kho_hoa_chat_ghi_giao_dich';  -- kỳ vọng đúng 1 dòng, 10 tham số
-- Sau apply: SELECT position('cssd_kho_hoa_chat_su_co:' IN pg_get_functiondef('public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text,uuid,numeric,text,date,text,uuid,uuid,text,text)'::regprocedure)) > 0;
