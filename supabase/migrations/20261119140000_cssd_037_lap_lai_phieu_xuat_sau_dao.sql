-- ADR: docs/adr/20261119-cssd-037-lap-lai-phieu-xuat-sau-dao.md
-- CSSD-037 (PO duyệt 19/11): sau khi đảo phiếu XUẤT hóa chất (CSSD-034), sự cố vẫn bị coi «đã có phiếu».
-- (1) rpc_cssd_kho_hoa_chat_ghi_giao_dich: vị từ chặn phiếu XUẤT thứ hai (CSSD-032) bỏ qua phiếu đã đảo xong
--     (có phiếu ngược DA_DUYET còn hiệu lực trỏ phieu_goc_id về nó) — cùng quy tắc rpc_cssd_apply_incident_void (CSSD-039).
--     Phiếu ngược CHO_DUYET vẫn chặn. Phiếu ngược có su_co_id NULL (CHECK) nên không tự bị đếm.
-- (3) rpc_cssd_kho_hoa_chat_lap_phieu_nguoc: phiếu gốc lý do HET_HAN_HUY → nối ghi chú cảnh báo lô quá hạn vào ghi_chu.
--     Hành vi cộng lại tồn lô quá hạn khi duyệt giữ nguyên (hàm duyệt không đổi).
-- Thân hàm chép nguyên bản mới nhất (ghi: 20261119110000; lập ngược: 20261118120000; đã so pg_get_functiondef local), chỉ đổi 2 chỗ.
-- Không đổi chữ ký, SECURITY DEFINER, search_path; REVOKE/GRANT lặp lại y như cũ (chỉ service_role).
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
    -- CSSD-039: sự cố phải còn hiệu lực. FOR SHARE chờ rpc_cssd_apply_incident_void (FOR UPDATE cùng dòng)
    -- commit xong rồi đọc bản mới nhất, nên hủy chạy đồng thời không lọt phiếu gắn sự cố đã hủy.
    -- Thứ tự khóa: advisory hóa chất → advisory sự cố → dòng sự cố (void chỉ khóa dòng sự cố, không vòng).
    -- Phiếu ngược (CSSD-034) không đi qua nhánh này: su_co_id luôn NULL (CHECK cssd_fact_kho_hc_phieu_nguoc_check).
    PERFORM 1 FROM public.cssd_fact_su_co s
     WHERE s.id = p_su_co_id AND s.is_active = true
       FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sự cố không tồn tại hoặc đã bị vô hiệu. Không lập phiếu xuất kho hóa chất cho sự cố này.'
        USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
       WHERE g.su_co_id = p_su_co_id
         AND g.is_active = true
         AND g.trang_thai <> 'TU_CHOI'
         -- CSSD-037: phiếu đã đảo xong (phiếu ngược DA_DUYET còn hiệu lực) không còn tính là «đã có phiếu».
         AND NOT EXISTS (
           SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich n
            WHERE n.phieu_goc_id = g.id
              AND n.is_active = true
              AND n.trang_thai = 'DA_DUYET'
         )
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

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(
  p_phieu_goc_id uuid, p_ly_do text, p_actor_user_id uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ly_do text := nullif(btrim(coalesce(p_ly_do, '')), '');
  v_dm uuid;
  r public.cssd_fact_kho_hoa_chat_giao_dich%ROWTYPE;
  v_ns uuid;
  v_ma text;
  v_id uuid;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người lập phiếu.' USING ERRCODE = 'P0001';
  END IF;
  IF p_phieu_goc_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu phiếu gốc cần lập phiếu ngược.' USING ERRCODE = 'P0001';
  END IF;
  IF v_ly_do IS NULL THEN
    RAISE EXCEPTION 'Nhập lý do lập phiếu ngược.' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_ly_do) > 500 THEN
    RAISE EXCEPTION 'Lý do lập phiếu ngược tối đa 500 ký tự.' USING ERRCODE = 'P0001';
  END IF;

  SELECT dm_hoa_chat_id INTO v_dm
    FROM public.cssd_fact_kho_hoa_chat_giao_dich WHERE id = p_phieu_goc_id;
  IF v_dm IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu gốc.' USING ERRCODE = 'P0001';
  END IF;
  -- Cùng khóa với rpc ghi/duyệt: tuần tự hóa theo hóa chất.
  PERFORM pg_advisory_xact_lock(hashtextextended('cssd_kho_hoa_chat:' || v_dm::text, 0));

  SELECT * INTO r FROM public.cssd_fact_kho_hoa_chat_giao_dich
   WHERE id = p_phieu_goc_id FOR UPDATE;
  IF NOT COALESCE(r.is_active, true) THEN
    RAISE EXCEPTION 'Phiếu gốc % đã bị hủy, không lập phiếu ngược.', r.ma_phieu USING ERRCODE = 'P0001';
  END IF;
  IF r.phieu_goc_id IS NOT NULL THEN
    RAISE EXCEPTION 'Phiếu % đã là phiếu ngược, không lập ngược tiếp.', r.ma_phieu USING ERRCODE = 'P0001';
  END IF;
  IF r.loai_giao_dich <> 'XUAT' THEN
    RAISE EXCEPTION 'Chỉ lập phiếu ngược cho phiếu XUẤT (phiếu % là %).', r.ma_phieu, r.loai_giao_dich
      USING ERRCODE = 'P0001';
  END IF;
  IF r.trang_thai <> 'DA_DUYET' THEN
    RAISE EXCEPTION 'Chỉ lập phiếu ngược cho phiếu đã duyệt (phiếu % đang %).', r.ma_phieu, r.trang_thai
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_kho_hoa_chat_giao_dich g
     WHERE g.phieu_goc_id = r.id
       AND g.is_active
       AND g.trang_thai <> 'TU_CHOI'
  ) THEN
    RAISE EXCEPTION 'Phiếu % đã có phiếu ngược (chưa bị từ chối). Không lập phiếu ngược thứ hai.', r.ma_phieu
      USING ERRCODE = 'P0001';
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := 'NG-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
          || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  INSERT INTO public.cssd_fact_kho_hoa_chat_giao_dich (
    ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, ma_lo, han_su_dung,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_by, trang_thai, ly_do_xuat,
    phieu_goc_id, ly_do_dao, updated_at
  ) VALUES (
    v_ma, r.dm_hoa_chat_id, 'NHAP', -r.so_luong_co_dau, r.ma_lo, r.han_su_dung,
    'Phiếu ngược của ' || r.ma_phieu
      -- CSSD-037 (3): đảo phiếu hủy lô hết hạn thì duyệt sẽ cộng lại tồn lô đã quá hạn — ghi rõ trên phiếu.
      || CASE WHEN r.ly_do_xuat = 'HET_HAN_HUY'
              THEN '. Lưu ý: phiếu gốc xuất hủy lô hết hạn (HSD '
                   || coalesce(to_char(r.han_su_dung, 'DD/MM/YYYY'), '?')
                   || '); duyệt phiếu ngược sẽ cộng lại tồn lô đã quá hạn, không dùng lô này để cấp.'
              ELSE '' END,
    NULL, v_ns, p_actor_user_id, 'CHO_DUYET', NULL,
    r.id, v_ly_do, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc(uuid, text, uuid)
  TO service_role;

-- Hoàn tác: migration ngược chép lại nguyên thân hàm của 20261119110000 (ghi_giao_dich) và 20261118120000 (lap_phieu_nguoc).

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc), trước khi apply — CSSD-034 và CSSD-039 phải đã apply:
--   SELECT 1 FROM information_schema.columns WHERE table_name = 'cssd_fact_kho_hoa_chat_giao_dich' AND column_name = 'phieu_goc_id';  -- 1 dòng
--   SELECT position('CSSD-039' IN pg_get_functiondef('public.rpc_cssd_kho_hoa_chat_ghi_giao_dich(text,uuid,numeric,text,date,text,uuid,uuid,text,text)'::regprocedure)) > 0;  -- true
--   SELECT oid::regprocedure FROM pg_proc WHERE proname IN ('rpc_cssd_kho_hoa_chat_ghi_giao_dich', 'rpc_cssd_kho_hoa_chat_lap_phieu_nguoc');  -- 2 dòng
-- Sau apply:
--   SELECT proname, position('CSSD-037' IN pg_get_functiondef(oid)) > 0 FROM pg_proc
--    WHERE proname IN ('rpc_cssd_kho_hoa_chat_ghi_giao_dich', 'rpc_cssd_kho_hoa_chat_lap_phieu_nguoc');  -- 2 × true
