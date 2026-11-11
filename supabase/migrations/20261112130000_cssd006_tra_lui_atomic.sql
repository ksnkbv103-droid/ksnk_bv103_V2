-- CHƯA APPLY PROD — chờ PO.
-- CSSD-006 (sổ lỗi): trả lui một bước nguyên tử.
-- Trước: ứng dụng làm 3 bước rời — (1) rpc_cssd_nhat_ky_ghi ghi TRA_VE vào metadata.nhat_ky (chỉ thêm,
-- trigger trg_cssd_guard_nhat_ky_chi_them), (2) UPDATE trạm có điều kiện tram_hien_tai_id, (3) append
-- metadata.ngoai_le (TRA_LUI_VOLUNTARY_ONE_STEP). Bước 2 lỗi/0 dòng → nhật ký còn sự kiện trả lui không xảy ra.
-- Sau: một RPC khóa dòng (FOR UPDATE), kiểm hết điều kiện TRƯỚC khi ghi, rồi MỘT câu UPDATE gồm
-- trạm + xóa dấu trạm + (nếu Đóng gói, mẻ chưa chốt nạp) gỡ lo_tiet_khuan_id + append nhat_ky + append ngoai_le.
-- Mọi nhánh {success:false} trả về trước UPDATE → không ghi gì.
--
-- Phạm vi đã rà: rpc_cssd_nhat_ky_ghi (20261111160000), fn_cssd_nhat_ky_dong, fn_cssd_me_nguoi_thao_tac,
-- fn_require_cssd_workflow_edit, rpc_cssd_quy_trinh_append_ngoai_le, trigger trên cssd_fact_quy_trinh
-- (nhat_ky chỉ thêm, chan_bo_me_khong_dat — một UPDATE giữ đúng điều kiện kích hoạt như trước), view cssd_dm_tram.
-- Quy tắc xóa dấu = buildClearAfterKeepPatch(prev, cur) với lui đúng 1 bước = chỉ trạm hiện tại
-- (+ ma_cycle_qr/bom_kiem_dem_* khi trạm là DONG_GOI). Chỉ cho LAM_SACH/QC/DONG_GOI (TK/CP/TIEP_NHAN bị chặn như app).
-- Phụ thuộc: 20261111160000_cssd_nhat_ky_ghi_actor.sql (fn_cssd_me_nguoi_thao_tac) phải có trước.
-- rpc_cssd_nhat_ky_ghi giữ nguyên (CHON_BO vẫn dùng).
--
-- Khôi phục: DROP FUNCTION public.rpc_cssd_tra_lui_mot_buoc(uuid, text, text, uuid, text, text);
--   và trả code executeRejectToPreviousStation về bản 3 bước (git). Không đụng dữ liệu/bảng.

CREATE OR REPLACE FUNCTION public.rpc_cssd_tra_lui_mot_buoc(
  p_quy_trinh_id uuid,
  p_tu_tram text,
  p_ly_do text,
  p_actor_user_id uuid DEFAULT NULL,
  p_nguoi_thao_tac text DEFAULT NULL,
  p_ma_qr text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_tu text := upper(btrim(coalesce(p_tu_tram, '')));
  v_den text;
  v_ly_do text := btrim(coalesce(p_ly_do, ''));
  v_op text := coalesce(nullif(btrim(coalesce(p_nguoi_thao_tac, '')), ''), 'CSSD');
  v_ns uuid;
  v_tu_id uuid;
  v_den_id uuid;
  v_row public.cssd_fact_quy_trinh%ROWTYPE;
  v_clear_lo boolean := false;
  v_truoc jsonb;
  v_nk jsonb;
  v_nl jsonb;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();

  v_den := CASE v_tu WHEN 'LAM_SACH' THEN 'TIEP_NHAN' WHEN 'QC' THEN 'LAM_SACH' WHEN 'DONG_GOI' THEN 'QC' END;
  IF v_den IS NULL THEN
    RETURN json_build_object('success', false, 'message',
      'Chỉ trả lui thủ công từ Làm sạch, QC hoặc Đóng gói.');
  END IF;
  IF v_ly_do = '' THEN
    RETURN json_build_object('success', false, 'message', 'Vui lòng nhập lý do trả lui.');
  END IF;

  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN json_build_object('success', false, 'message',
      'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người thao tác.');
  END IF;

  SELECT t.id INTO v_tu_id FROM public.cssd_dm_tram t WHERE t.is_active AND upper(t.ma_tram) = v_tu LIMIT 1;
  IF v_tu_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm CSSD không hợp lệ: ' || v_tu);
  END IF;
  SELECT t.id INTO v_den_id FROM public.cssd_dm_tram t WHERE t.is_active AND upper(t.ma_tram) = v_den LIMIT 1;
  IF v_den_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Trạm CSSD không hợp lệ: ' || v_den);
  END IF;

  SELECT * INTO v_row FROM public.cssd_fact_quy_trinh q WHERE q.id = p_quy_trinh_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy QR quy trình.');
  END IF;
  IF v_row.is_dong_bang THEN
    RETURN json_build_object('success', false, 'message', 'Đang khóa an toàn — không trả lui thủ công.');
  END IF;
  IF v_row.tram_hien_tai_id IS DISTINCT FROM v_tu_id THEN
    RETURN json_build_object('success', false, 'message', 'Bộ đã đổi trạm — không trả lui.');
  END IF;

  -- Cùng quy tắc app cũ: Đóng gói có mẻ mà mẻ chưa chốt nạp (hoặc không tìm thấy mẻ) → gỡ mẻ.
  IF v_tu = 'DONG_GOI' AND v_row.lo_tiet_khuan_id IS NOT NULL THEN
    v_clear_lo := NOT EXISTS (
      SELECT 1 FROM public.cssd_fact_lo_tiet_khuan l
      WHERE l.id = v_row.lo_tiet_khuan_id AND l.tk_chot_nap_at IS NOT NULL
    );
  END IF;

  -- Ảnh chụp dấu trạm trước khi xóa (bỏ null/rỗng như collectStationStampSnapshot).
  v_truoc := jsonb_strip_nulls(CASE v_tu
    WHEN 'LAM_SACH' THEN jsonb_build_object(
      'thoi_gian_lam_sach', v_row.thoi_gian_lam_sach, 'nguoi_lam_sach_id', v_row.nguoi_lam_sach_id)
    WHEN 'QC' THEN jsonb_build_object(
      'thoi_gian_qc', v_row.thoi_gian_qc, 'nguoi_kiem_tra_id', v_row.nguoi_kiem_tra_id)
    ELSE jsonb_build_object(
      'thoi_gian_dong_goi', v_row.thoi_gian_dong_goi, 'nguoi_dong_goi_id', v_row.nguoi_dong_goi_id,
      'ma_cycle_qr', nullif(btrim(coalesce(v_row.ma_cycle_qr, '')), ''),
      'bom_kiem_dem_at', v_row.bom_kiem_dem_at, 'bom_kiem_dem_boi_id', v_row.bom_kiem_dem_boi_id)
  END);

  v_nk := public.fn_cssd_nhat_ky_dong('TRA_VE', v_tu, v_ns, NULL,
    jsonb_build_object('tu', v_tu, 'den', v_den, 'ly_do', v_ly_do, 'truoc', v_truoc));

  v_nl := jsonb_build_object(
    'su_kien', 'TRA_LUI_VOLUNTARY_ONE_STEP',
    'thoi_gian', to_jsonb(clock_timestamp()),
    'nguoi_thao_tac', v_op,
    'tu_tram', v_tu,
    'den_tram', v_den,
    'ly_do', 'Trả lui ' || v_tu || ' → ' || v_den,
    'chi_tiet', jsonb_strip_nulls(jsonb_build_object(
      'ma_qr_quy_trinh', nullif(upper(btrim(coalesce(p_ma_qr, ''))), ''),
      'tu', v_tu,
      'den', v_den,
      'ly_do', v_ly_do,
      'nguoi_thao_tac', v_op,
      'clear_stations', jsonb_build_array(v_tu),
      'before', v_truoc
    ))
  );

  UPDATE public.cssd_fact_quy_trinh q SET
    tram_hien_tai_id    = v_den_id,
    thoi_gian_lam_sach  = CASE WHEN v_tu = 'LAM_SACH' THEN NULL ELSE q.thoi_gian_lam_sach END,
    nguoi_lam_sach_id   = CASE WHEN v_tu = 'LAM_SACH' THEN NULL ELSE q.nguoi_lam_sach_id END,
    thoi_gian_qc        = CASE WHEN v_tu = 'QC' THEN NULL ELSE q.thoi_gian_qc END,
    nguoi_kiem_tra_id   = CASE WHEN v_tu = 'QC' THEN NULL ELSE q.nguoi_kiem_tra_id END,
    thoi_gian_dong_goi  = CASE WHEN v_tu = 'DONG_GOI' THEN NULL ELSE q.thoi_gian_dong_goi END,
    nguoi_dong_goi_id   = CASE WHEN v_tu = 'DONG_GOI' THEN NULL ELSE q.nguoi_dong_goi_id END,
    ma_cycle_qr         = CASE WHEN v_tu = 'DONG_GOI' THEN NULL ELSE q.ma_cycle_qr END,
    bom_kiem_dem_at     = CASE WHEN v_tu = 'DONG_GOI' THEN NULL ELSE q.bom_kiem_dem_at END,
    bom_kiem_dem_boi_id = CASE WHEN v_tu = 'DONG_GOI' THEN NULL ELSE q.bom_kiem_dem_boi_id END,
    lo_tiet_khuan_id    = CASE WHEN v_clear_lo THEN NULL ELSE q.lo_tiet_khuan_id END,
    metadata = jsonb_set(
      jsonb_set(
        coalesce(q.metadata, '{}'::jsonb),
        '{nhat_ky}',
        coalesce(q.metadata -> 'nhat_ky', '[]'::jsonb) || jsonb_build_array(v_nk),
        true),
      '{ngoai_le}',
      coalesce(q.metadata -> 'ngoai_le', '[]'::jsonb) || jsonb_build_array(v_nl),
      true),
    updated_at = now()
  WHERE q.id = p_quy_trinh_id;

  RETURN json_build_object('success', true, 'tu', v_tu, 'den', v_den);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_tra_lui_mot_buoc(uuid, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_tra_lui_mot_buoc(uuid, text, text, uuid, text, text) TO service_role;

-- CHƯA APPLY PROD — chờ PO. Apply 20261111160000 trước nếu prod chưa có; deploy code chỉ SAU khi apply.
-- Kiểm prod (chỉ đọc):
--   SELECT oid::regprocedure FROM pg_proc WHERE proname IN ('rpc_cssd_tra_lui_mot_buoc','fn_cssd_me_nguoi_thao_tac','fn_cssd_nhat_ky_dong');
--     trước: thiếu rpc_cssd_tra_lui_mot_buoc · sau: đủ 3 dòng
--   SELECT has_function_privilege('authenticated','public.rpc_cssd_tra_lui_mot_buoc(uuid,text,text,uuid,text,text)','execute'),
--          has_function_privilege('anon','public.rpc_cssd_tra_lui_mot_buoc(uuid,text,text,uuid,text,text)','execute'),
--          has_function_privilege('service_role','public.rpc_cssd_tra_lui_mot_buoc(uuid,text,text,uuid,text,text)','execute');
--     sau: false, false, true
--   SELECT 1 FROM information_schema.columns WHERE table_name='cssd_fact_lo_tiet_khuan' AND column_name='tk_chot_nap_at';
