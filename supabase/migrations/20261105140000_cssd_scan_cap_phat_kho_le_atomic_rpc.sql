-- B3: gom các bước ghi nhiều lần của CSSD vào một transaction (additive, không đổi hàm cũ).
--   (1a) rpc_cssd_scan_station_commit  : quét trạm + (DONG_GOI) gán mã chu trình / (CAP_PHAT) khoa nhận + ma_ca_mo_id
--   (1b) rpc_cssd_cap_phat_commit      : xác nhận cấp phát gói ở kho sạch (giờ/người cấp phát + khoa nhận + ma_ca_mo_id)
--   (2)  rpc_cssd_decommission_kho_le  : loại biên hao mòn từ kho lẻ (trừ tồn có điều kiện + ghi sổ giao dịch)
-- Caller là admin client (service_role) sau verify quyền ở server action → ACL chỉ service_role.
-- Lỗi kiểm trước khi ghi: trả json {success:false, code, message}. Lỗi sau khi đã ghi: RAISE → rollback cả hàm.

-- (1a) ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_cssd_scan_station_commit(
  p_ma_qr text,
  p_target_station text,
  p_operator_label text DEFAULT 'CSSD',
  p_khoa_nhan_id uuid DEFAULT NULL,
  p_ma_ca_mo_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_station text := upper(btrim(coalesce(p_target_station, '')));
  v_ma_ca_mo text := nullif(btrim(coalesce(p_ma_ca_mo_id, '')), '');
  v_res json;
  v_qt_id uuid;
  v_khoa uuid;
  v_cycle json;
  v_ma_cycle text;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();

  IF v_station = 'CAP_PHAT' AND p_khoa_nhan_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.mdm_dm_khoa_phong k WHERE k.id = p_khoa_nhan_id) THEN
    RETURN json_build_object('success', false, 'code', 'KHOA_NHAN_KHONG_TON_TAI',
      'message', 'Khoa nhận không tồn tại trong danh mục.');
  END IF;

  -- Khóa dòng (FOR UPDATE) + kiểm trạm nằm trong impl; lỗi của impl đều trả trước khi ghi.
  v_res := public.rpc_scan_workflow_station_impl(p_ma_qr, p_target_station, p_operator_label);
  IF coalesce((v_res ->> 'success')::boolean, false) IS NOT TRUE THEN
    RETURN v_res;
  END IF;

  v_qt_id := public.fn_cssd_resolve_active_quy_trinh_id(p_ma_qr);
  IF v_qt_id IS NULL THEN
    RAISE EXCEPTION 'Quét trạm đã ghi nhưng không xác định được quy trình active — đã hoàn tác.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_station = 'CAP_PHAT' THEN
    UPDATE public.cssd_fact_quy_trinh q
       SET khoa_nhan_id = coalesce(
             p_khoa_nhan_id,
             q.khoa_nhan_id,
             (SELECT b.khoa_su_dung_id FROM public.cssd_dm_bo_dung_cu b WHERE b.id = q.bo_dung_cu_id)),
           updated_at = now()
     WHERE q.id = v_qt_id
    RETURNING q.khoa_nhan_id INTO v_khoa;
    IF v_ma_ca_mo IS NOT NULL THEN
      UPDATE public.cssd_fact_quy_trinh q
         SET metadata = coalesce(q.metadata, '{}'::jsonb) || jsonb_build_object('ma_ca_mo_id', v_ma_ca_mo),
             updated_at = now()
       WHERE q.id = v_qt_id;
    END IF;
  ELSIF v_station = 'DONG_GOI' THEN
    v_cycle := public.rpc_cssd_assign_cycle_qr_impl(v_qt_id);
    v_ma_cycle := nullif(btrim(coalesce(v_cycle ->> 'ma_cycle_qr', '')), '');
    IF coalesce((v_cycle ->> 'success')::boolean, false) IS NOT TRUE OR v_ma_cycle IS NULL THEN
      RAISE EXCEPTION 'Không gán được mã chu trình — đóng gói đã hoàn tác, quét lại. (%)',
        coalesce(v_cycle ->> 'message', 'ma_cycle_qr rỗng')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'data', v_res -> 'data',
    'quy_trinh_id', v_qt_id,
    'ma_cycle_qr', v_ma_cycle,
    'khoa_nhan_id', v_khoa
  );
END;
$function$;

-- (1b) ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_cssd_cap_phat_commit(
  p_quy_trinh_id uuid,
  p_nguoi_cap_phat_id uuid DEFAULT NULL,
  p_khoa_nhan_id uuid DEFAULT NULL,
  p_ma_ca_mo_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ma_ca_mo text := nullif(btrim(coalesce(p_ma_ca_mo_id, '')), '');
  v_row record;
  v_khoa uuid;
  v_tg timestamptz;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();

  IF p_quy_trinh_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'THIEU_QUY_TRINH', 'message', 'Thiếu quy trình.');
  END IF;
  IF p_khoa_nhan_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.mdm_dm_khoa_phong k WHERE k.id = p_khoa_nhan_id) THEN
    RETURN json_build_object('success', false, 'code', 'KHOA_NHAN_KHONG_TON_TAI',
      'message', 'Khoa nhận không tồn tại trong danh mục.');
  END IF;

  SELECT q.id, q.thoi_gian_cap_phat, upper(coalesce(t.ma_tram, '')) AS ma_tram
    INTO v_row
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
   WHERE q.id = p_quy_trinh_id
     AND q.is_active = true
     FOR UPDATE OF q;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'QUY_TRINH_KHONG_TON_TAI',
      'message', 'Không tìm thấy quy trình active.');
  END IF;
  IF v_row.ma_tram <> 'CAP_PHAT' THEN
    RETURN json_build_object('success', false, 'code', 'SAI_TRAM',
      'message', 'Bộ chưa ở kho sạch (Cấp phát) — không xác nhận cấp phát.');
  END IF;
  IF v_row.thoi_gian_cap_phat IS NOT NULL THEN
    RETURN json_build_object('success', false, 'code', 'DA_CAP_PHAT',
      'message', 'Bộ dụng cụ đã được cấp phát trước đó (hoặc vừa được người khác cấp phát). Tải lại để xem.');
  END IF;

  -- trg_cssd_guard_pack_issuance chặn gói không an toàn (RAISE → rollback toàn bộ).
  UPDATE public.cssd_fact_quy_trinh q
     SET thoi_gian_cap_phat = now(),
         nguoi_cap_phat_id = coalesce(p_nguoi_cap_phat_id, q.nguoi_cap_phat_id),
         khoa_nhan_id = coalesce(
           p_khoa_nhan_id,
           q.khoa_nhan_id,
           (SELECT b.khoa_su_dung_id FROM public.cssd_dm_bo_dung_cu b WHERE b.id = q.bo_dung_cu_id)),
         updated_at = now()
   WHERE q.id = p_quy_trinh_id
  RETURNING q.khoa_nhan_id, q.thoi_gian_cap_phat INTO v_khoa, v_tg;

  IF v_ma_ca_mo IS NOT NULL THEN
    UPDATE public.cssd_fact_quy_trinh q
       SET metadata = coalesce(q.metadata, '{}'::jsonb) || jsonb_build_object('ma_ca_mo_id', v_ma_ca_mo),
           updated_at = now()
     WHERE q.id = p_quy_trinh_id;
  END IF;

  RETURN json_build_object('success', true, 'quy_trinh_id', p_quy_trinh_id,
    'thoi_gian_cap_phat', v_tg, 'khoa_nhan_id', v_khoa);
END;
$function$;

-- (2) ----------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_cssd_decommission_kho_le(
  p_loai_dung_cu_id uuid,
  p_so_luong integer,
  p_ghi_chu text DEFAULT NULL,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_con integer;
  v_ton integer;
BEGIN
  PERFORM public.fn_cssd_assert_ledger_write();
  v_actor := public.fn_cssd_resolve_ledger_actor(p_nguoi_thuc_hien_id);

  IF p_loai_dung_cu_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'THIEU_LOAI', 'message', 'Vui lòng chọn loại dụng cụ.');
  END IF;
  IF p_so_luong IS NULL OR p_so_luong <= 0 THEN
    RETURN json_build_object('success', false, 'code', 'SO_LUONG_KHONG_HOP_LE',
      'message', 'Số lượng thanh lý/loại biên phải lớn hơn 0.');
  END IF;

  -- Trừ có điều kiện trên một câu UPDATE (khóa dòng ngầm) → không lost update, không âm tồn.
  UPDATE public.cssd_dm_loai_dung_cu l
     SET so_luong_kho_du_phong = l.so_luong_kho_du_phong - p_so_luong,
         updated_at = now()
   WHERE l.id = p_loai_dung_cu_id
     AND l.so_luong_kho_du_phong >= p_so_luong
  RETURNING l.so_luong_kho_du_phong INTO v_con;

  IF NOT FOUND THEN
    SELECT l.so_luong_kho_du_phong INTO v_ton FROM public.cssd_dm_loai_dung_cu l WHERE l.id = p_loai_dung_cu_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'code', 'LOAI_KHONG_TON_TAI',
        'message', 'Không tìm thấy loại dụng cụ.');
    END IF;
    RETURN json_build_object('success', false, 'code', 'KHONG_DU_TON', 'ton', coalesce(v_ton, 0),
      'message', format('Kho lẻ không đủ số lượng để loại biên (hiện có %s).', coalesce(v_ton, 0)));
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id, bo_dung_cu_id, loai_giao_dich, so_luong_thay_doi,
    ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
  ) VALUES (
    p_loai_dung_cu_id, NULL, 'BAO_HONG', -p_so_luong,
    nullif(btrim(coalesce(p_ghi_chu, '')), ''), NULL, v_actor, now(), now()
  );

  RETURN json_build_object('success', true, 'ton_con_lai', v_con);
END;
$function$;

-- ACL: default privileges đã bị thu; khẳng định chỉ service_role.
REVOKE ALL ON FUNCTION public.rpc_cssd_scan_station_commit(text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_cap_phat_commit(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_decommission_kho_le(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_scan_station_commit(text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_cap_phat_commit(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_decommission_kho_le(uuid, integer, text, uuid) TO service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc):
--   SELECT p.oid::regprocedure, p.prosecdef, p.proconfig, p.proacl FROM pg_proc p
--    WHERE p.proname IN ('rpc_cssd_scan_station_commit','rpc_cssd_cap_phat_commit','rpc_cssd_decommission_kho_le');
--     -- kỳ vọng 3 dòng, prosecdef=t, {search_path=public}, proacl {postgres=X/postgres,service_role=X/postgres}
--   SELECT p.oid::regprocedure FROM pg_proc p
--    WHERE p.proname IN ('rpc_scan_workflow_station_impl','rpc_cssd_assign_cycle_qr_impl',
--                        'fn_cssd_resolve_active_quy_trinh_id','fn_require_cssd_workflow_edit',
--                        'fn_cssd_assert_ledger_write','fn_cssd_resolve_ledger_actor');  -- kỳ vọng đủ 6 phụ thuộc
--   SELECT tgname FROM pg_trigger WHERE tgrelid='public.cssd_fact_quy_trinh'::regclass
--    AND tgname IN ('trg_cssd_guard_pack_issuance','trg_cssd_guard_cap_phat_khong_ghi_de');  -- kỳ vọng 2
