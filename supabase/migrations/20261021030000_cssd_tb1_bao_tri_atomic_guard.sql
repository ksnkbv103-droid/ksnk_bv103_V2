-- TB-1 (handover-roadmap §5): bảo trì thiết bị CSSD nguyên tử + ghi người thao tác
-- + chặn client (authenticated/anon) sửa thẳng trạng thái máy / kết quả Bowie-Dick.
--
-- Giả định (PO giao tự quyết, chờ duyệt):
--  G1. "1 phiếu mở / máy" ĐÃ CÓ index `idx_fact_bao_tri_one_dang_per_tb` (baseline) → không tạo lại.
--  G2. Người thao tác lưu theo auth user id (luôn có) ở cột mới *_boi; `nguoi_thuc_hien_id`
--      (mdm_nhan_su) điền best-effort theo mdm_nhan_su.auth_user_id.
--  G3. Mọi luồng hợp lệ hiện có ghi cssd_dm_thiet_bi bằng service_role (server action) hoặc RPC
--      SECURITY DEFINER (current_user = owner) → trigger chỉ chặn current_user IN (authenticated, anon).
--      Repo chưa có mẫu cờ session (set_config/current_setting app.*) nên không dùng cờ.
--  G4. Kết quả BD nằm trong specs: khóa `bd_%`; kèm khóa bảo trì/thẩm định
--      `bao_tri_prev_trang_thai`, `tham_dinh_bi`, `tham_dinh_at`, `tham_dinh_ghi_chu`.
--  G5. Ngày bảo trì gần nhất tính theo giờ VN (Asia/Ho_Chi_Minh); TS cũ dùng UTC.
--  G6. Checklist DINH_KY: DB kiểm mọi phần tử có done=true (khớp allChecklistDone).
--  Nợ: thẩm định 3 BI âm đối chiếu hồ sơ BI — chưa làm (cần hồ sơ BI).

-- 1) Cột additive ghi người thao tác
ALTER TABLE public.cssd_fact_bao_tri
  ADD COLUMN IF NOT EXISTS bat_dau_boi uuid,
  ADD COLUMN IF NOT EXISTS ket_thuc_boi uuid,
  ADD COLUMN IF NOT EXISTS huy_boi uuid;

COMMENT ON COLUMN public.cssd_fact_bao_tri.bat_dau_boi IS 'TB-1: auth user id mở phiếu';
COMMENT ON COLUMN public.cssd_fact_bao_tri.ket_thuc_boi IS 'TB-1: auth user id hoàn thành phiếu';
COMMENT ON COLUMN public.cssd_fact_bao_tri.huy_boi IS 'TB-1: auth user id hủy phiếu';

-- 2) Bắt đầu bảo trì
CREATE OR REPLACE FUNCTION public.rpc_cssd_bao_tri_bat_dau(
  p_thiet_bi_id uuid,
  p_actor_user_id uuid,
  p_ly_do text,
  p_loai_phieu text DEFAULT 'DINH_KY',
  p_checklist jsonb DEFAULT '[]'::jsonb,
  p_su_co_id uuid DEFAULT NULL,
  p_ma_phieu text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tb public.cssd_dm_thiet_bi%ROWTYPE;
  v_st text;
  v_open text;
  v_loai text;
  v_ma text;
  v_ns uuid;
  v_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  IF p_thiet_bi_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu thiết bị.';
  END IF;
  IF coalesce(btrim(p_ly_do), '') = '' THEN
    RAISE EXCEPTION 'Nhập lý do / nội dung bảo trì.';
  END IF;
  v_loai := CASE WHEN upper(coalesce(p_loai_phieu, '')) = 'SUA_CHUA' THEN 'SUA_CHUA' ELSE 'DINH_KY' END;

  SELECT * INTO v_tb FROM public.cssd_dm_thiet_bi WHERE id = p_thiet_bi_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy thiết bị.';
  END IF;
  v_st := btrim(coalesce(v_tb.trang_thai, ''));
  IF v_st NOT IN ('READY', 'HOAT_DONG', 'HOLD_QC') THEN
    RAISE EXCEPTION 'Thiết bị không mở được bảo trì (%).', coalesce(nullif(v_st, ''), '—');
  END IF;

  -- Mẻ chưa kết luận (kể cả CHO_BI) vẫn chặn bảo trì — khớp helper TS coMeTietKhuanChuaKetThucTheoThietBi
  SELECT ma_lo_tiet_khuan INTO v_open
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE thiet_bi_id = p_thiet_bi_id
    AND is_active = true
    AND ket_qua_test IS NULL
    AND coalesce(trang_thai_me, '') NOT IN ('HOAN_THANH', 'QC_KHONG_DAT', 'THU_HOI')
  LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'Còn mẻ tiệt khuẩn chưa kết thúc QC trên máy này (lô %). Hoàn tất hoặc xử lý mẻ trước khi bảo trì.', v_open;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cssd_fact_bao_tri
    WHERE thiet_bi_id = p_thiet_bi_id AND trang_thai = 'DANG_THUC_HIEN' AND coalesce(is_active, true)
  ) THEN
    RAISE EXCEPTION 'Máy đã có phiếu bảo trì đang thực hiện.';
  END IF;

  SELECT ns.id INTO v_ns FROM public.mdm_nhan_su ns
  WHERE ns.auth_user_id = p_actor_user_id AND ns.is_active = true LIMIT 1;

  v_ma := coalesce(
    nullif(btrim(p_ma_phieu), ''),
    'BT-' || to_char(v_now AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  );

  INSERT INTO public.cssd_fact_bao_tri (
    ma_phieu, thiet_bi_id, trang_thai, loai_phieu, ly_do, checklist_jsonb, su_co_id,
    thoi_gian_bat_dau, updated_at, nguoi_thuc_hien_id, bat_dau_boi
  ) VALUES (
    v_ma, p_thiet_bi_id, 'DANG_THUC_HIEN', v_loai, btrim(p_ly_do),
    CASE WHEN v_loai = 'DINH_KY' AND jsonb_typeof(p_checklist) = 'array' THEN p_checklist ELSE '[]'::jsonb END,
    p_su_co_id, v_now, v_now, v_ns, p_actor_user_id
  )
  RETURNING id INTO v_id;

  UPDATE public.cssd_dm_thiet_bi
  SET trang_thai = 'REPAIRING',
      specs = coalesce(specs, '{}'::jsonb) || jsonb_build_object('bao_tri_prev_trang_thai', v_st),
      updated_at = v_now
  WHERE id = p_thiet_bi_id;

  RETURN jsonb_build_object('id', v_id, 'ma_phieu', v_ma);
END;
$function$;

-- 3) Kết thúc bảo trì
CREATE OR REPLACE FUNCTION public.rpc_cssd_bao_tri_ket_thuc(
  p_id uuid,
  p_actor_user_id uuid,
  p_ket_qua text,
  p_checklist jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ph public.cssd_fact_bao_tri%ROWTYPE;
  v_tb public.cssd_dm_thiet_bi%ROWTYPE;
  v_checklist jsonb;
  v_prev text;
  v_from_hold boolean;
  v_next text;
  v_now timestamptz := now();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_specs jsonb;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  IF coalesce(btrim(p_ket_qua), '') = '' THEN
    RAISE EXCEPTION 'Nhập kết quả / biên bản bàn giao.';
  END IF;

  SELECT * INTO v_ph FROM public.cssd_fact_bao_tri
  WHERE id = p_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu.';
  END IF;
  IF v_ph.trang_thai <> 'DANG_THUC_HIEN' THEN
    RAISE EXCEPTION 'Phiếu không đang ở trạng thái thực hiện.';
  END IF;

  v_checklist := CASE
    WHEN jsonb_typeof(p_checklist) = 'array' AND jsonb_array_length(p_checklist) > 0 THEN p_checklist
    ELSE coalesce(v_ph.checklist_jsonb, '[]'::jsonb)
  END;
  IF v_ph.loai_phieu = 'DINH_KY' AND jsonb_typeof(v_checklist) = 'array' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_checklist) e
    WHERE (e ->> 'done') IS DISTINCT FROM 'true'
  ) THEN
    RAISE EXCEPTION 'Hoàn thành tất cả mục checklist bảo dưỡng định kỳ.';
  END IF;

  SELECT * INTO v_tb FROM public.cssd_dm_thiet_bi WHERE id = v_ph.thiet_bi_id FOR UPDATE;
  v_specs := coalesce(v_tb.specs, '{}'::jsonb);
  v_prev := upper(btrim(coalesce(v_specs ->> 'bao_tri_prev_trang_thai', '')));
  v_from_hold := v_prev = 'HOLD_QC';
  v_next := CASE WHEN v_from_hold THEN 'CHO_THAM_DINH' ELSE 'READY' END;
  v_specs := v_specs - 'bao_tri_prev_trang_thai';
  IF v_from_hold THEN
    v_specs := v_specs || jsonb_build_object('bd_hold_bao_tri_xong_at', v_now);
  END IF;

  UPDATE public.cssd_fact_bao_tri
  SET trang_thai = 'HOAN_THANH', ket_qua_ghi_nhan = btrim(p_ket_qua), checklist_jsonb = v_checklist,
      thoi_gian_ket_thuc = v_now, updated_at = v_now, ket_thuc_boi = p_actor_user_id
  WHERE id = p_id;

  UPDATE public.cssd_dm_thiet_bi
  SET trang_thai = v_next,
      ngay_bao_tri_gan_nhat = v_today,
      ngay_bao_tri_tiep_theo = v_today + greatest(1, coalesce(v_tb.chu_ky_bao_tri_ngay, 180)),
      specs = v_specs,
      updated_at = v_now
  WHERE id = v_ph.thiet_bi_id;

  RETURN jsonb_build_object('id', p_id, 'trang_thai_may', v_next);
END;
$function$;

-- 4) Hủy phiếu đang mở
CREATE OR REPLACE FUNCTION public.rpc_cssd_bao_tri_huy(
  p_id uuid,
  p_actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ph public.cssd_fact_bao_tri%ROWTYPE;
  v_specs jsonb;
  v_restore text;
  v_now timestamptz := now();
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  SELECT * INTO v_ph FROM public.cssd_fact_bao_tri
  WHERE id = p_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiếu.';
  END IF;
  IF v_ph.trang_thai <> 'DANG_THUC_HIEN' THEN
    RAISE EXCEPTION 'Chỉ hủy được phiếu đang thực hiện.';
  END IF;

  SELECT coalesce(specs, '{}'::jsonb) INTO v_specs
  FROM public.cssd_dm_thiet_bi WHERE id = v_ph.thiet_bi_id FOR UPDATE;
  v_restore := coalesce(nullif(btrim(v_specs ->> 'bao_tri_prev_trang_thai'), ''), 'READY');

  UPDATE public.cssd_fact_bao_tri
  SET trang_thai = 'HUY', thoi_gian_ket_thuc = v_now, updated_at = v_now, huy_boi = p_actor_user_id
  WHERE id = p_id;

  UPDATE public.cssd_dm_thiet_bi
  SET trang_thai = v_restore, specs = v_specs - 'bao_tri_prev_trang_thai', updated_at = v_now
  WHERE id = v_ph.thiet_bi_id;

  RETURN jsonb_build_object('id', p_id, 'trang_thai_may', v_restore);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_bao_tri_bat_dau(uuid, uuid, text, text, jsonb, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_bao_tri_ket_thuc(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rpc_cssd_bao_tri_huy(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_bao_tri_bat_dau(uuid, uuid, text, text, jsonb, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_bao_tri_ket_thuc(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_bao_tri_huy(uuid, uuid) TO service_role;

-- 5) Trigger chặn client sửa thẳng trạng thái máy / kết quả BD (SECURITY INVOKER để current_user = người gọi)
CREATE OR REPLACE FUNCTION public.fn_cssd_thiet_bi_guard_trang_thai()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    RAISE EXCEPTION 'Không sửa trực tiếp trạng thái thiết bị; dùng luồng bảo trì / QC.'
      USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_old
  FROM jsonb_each(coalesce(OLD.specs, '{}'::jsonb))
  WHERE key LIKE 'bd\_%' OR key IN ('bao_tri_prev_trang_thai', 'tham_dinh_bi', 'tham_dinh_at', 'tham_dinh_ghi_chu');
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_new
  FROM jsonb_each(coalesce(NEW.specs, '{}'::jsonb))
  WHERE key LIKE 'bd\_%' OR key IN ('bao_tri_prev_trang_thai', 'tham_dinh_bi', 'tham_dinh_at', 'tham_dinh_ghi_chu');
  IF v_old IS DISTINCT FROM v_new THEN
    RAISE EXCEPTION 'Không sửa trực tiếp kết quả Bowie-Dick / thẩm định; dùng luồng QC.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_cssd_thiet_bi_guard_trang_thai() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cssd_thiet_bi_guard_trang_thai ON public.cssd_dm_thiet_bi;
CREATE TRIGGER trg_cssd_thiet_bi_guard_trang_thai
  BEFORE UPDATE ON public.cssd_dm_thiet_bi
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_thiet_bi_guard_trang_thai();

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc) trước khi apply:
--   SELECT thiet_bi_id, count(*) FROM public.cssd_fact_bao_tri
--   WHERE trang_thai = 'DANG_THUC_HIEN' AND coalesce(is_active, true) GROUP BY 1 HAVING count(*) > 1;  -- kỳ vọng 0 dòng
--   SELECT indexname FROM pg_indexes WHERE indexname = 'idx_fact_bao_tri_one_dang_per_tb';            -- kỳ vọng 1 dòng
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.cssd_dm_thiet_bi'::regclass AND NOT tgisinternal; -- kỳ vọng 0 trước apply
--   SELECT trang_thai, count(*) FROM public.cssd_dm_thiet_bi GROUP BY 1;
