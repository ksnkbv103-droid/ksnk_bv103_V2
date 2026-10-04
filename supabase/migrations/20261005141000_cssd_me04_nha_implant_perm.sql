-- ME-04 · quyền CSSD_ME_TIET_KHUAN.nha_implant (nhả implant / nhả sau BI âm / ghi CHO_BI)
-- File only — CHƯA apply.
-- Grant mặc định: ADMIN. Tài khoản tổ trưởng / phó thêm do Nghĩa chốt (N-ME-6) —
--   thêm grant tay hoặc mở rộng khối INSERT sys_role_permissions bên dưới.
-- App FE: verifyCssdBatchNhaImplant fallback sang `qc` nếu permission row chưa tồn tại.

-- 1) Permission catalog
INSERT INTO public.sys_permissions (module_name, action, description)
VALUES (
  'CSSD_ME_TIET_KHUAN',
  'nha_implant',
  'Nhả mẻ implant / sau BI âm / ghi chờ BI (tổ trưởng CSSD)'
)
ON CONFLICT (module_name, action) DO UPDATE SET
  description = EXCLUDED.description;

-- 2) Grant ADMIN (full matrix cũng đã cover khi sync; idempotent)
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'ADMIN'
  AND p.module_name = 'CSSD_ME_TIET_KHUAN'
  AND p.action = 'nha_implant'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- N-ME-6: thêm grant cho tài khoản/vai trò tổ trưởng do Nghĩa chỉ định, ví dụ:
-- INSERT INTO public.sys_role_permissions (role_id, permission_id)
-- SELECT r.id, p.id FROM public.sys_roles r, public.sys_permissions p
-- WHERE r.name = '<VAI_TRO_TO_TRUONG>' AND p.module_name = 'CSSD_ME_TIET_KHUAN' AND p.action = 'nha_implant'
-- ON CONFLICT DO NOTHING;

-- 3) Helper: kiểm quyền theo actor (service_role gọi RPC không có auth.uid())
CREATE OR REPLACE FUNCTION public.fn_sys_actor_has_permission(
  p_actor_user_id uuid,
  p_module text,
  p_action text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_actor_user_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.v_sys_user_permissions v
        WHERE v.auth_user_id = p_actor_user_id
          AND (
            v.roles ? 'ADMIN'
            OR v.permissions @> jsonb_build_array(
              jsonb_build_object('module', p_module, 'action', p_action)
            )
          )
      )
    );
$$;

-- 4) Assert nha_implant với fallback qc khi permission chưa seed
CREATE OR REPLACE FUNCTION public.fn_cssd_me_assert_nha_implant(p_actor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_perm boolean;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sys_permissions
    WHERE module_name = 'CSSD_ME_TIET_KHUAN' AND action = 'nha_implant'
  ) INTO v_has_perm;

  IF v_has_perm THEN
    IF NOT public.fn_sys_actor_has_permission(p_actor_user_id, 'CSSD_ME_TIET_KHUAN', 'nha_implant') THEN
      RAISE EXCEPTION 'Chỉ tổ trưởng CSSD (quyền nhả implant) được thao tác này.';
    END IF;
  ELSE
    -- Fallback pre-migration: giữ hành vi cũ theo qc
    IF NOT public.fn_sys_actor_has_permission(p_actor_user_id, 'CSSD_ME_TIET_KHUAN', 'qc') THEN
      RAISE EXCEPTION 'Bạn không có quyền QC mẻ tiệt khuẩn.';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sys_actor_has_permission(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cssd_me_assert_nha_implant(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sys_actor_has_permission(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cssd_me_assert_nha_implant(uuid) TO service_role;

-- 5) Patch rpc_cssd_me_nhap_bi_am — kiểm quyền đầu hàm (giữ signature ME-01 nếu đã có)
-- Ghi chú: khi apply, chạy sau 20261005140000_cssd_me01_bi_bm02.sql
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_nhap_bi_am(
  p_me_id uuid,
  p_actor_user_id uuid,
  p_nguoi_nhan_su_id uuid,
  p_qc_bi_json jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_bi jsonb := coalesce(p_qc_bi_json, '{}'::jsonb);
BEGIN
  PERFORM public.fn_cssd_me_assert_nha_implant(p_actor_user_id);

  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;

  -- BM.02 (ME-01): nếu helper chưa có (apply lệch thứ tự) → bỏ qua, app đã gate
  BEGIN
    PERFORM public.fn_cssd_me_bi_bm02_hop_le(v_bi || jsonb_build_object('trang_thai_bi', 'AM'), 'AM');
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF coalesce(v_me.trang_thai_me, '') IS DISTINCT FROM 'CHO_BI' THEN
    RAISE EXCEPTION 'Chỉ nhập BI cho mẻ đang chờ BI.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN.';
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
      AND q.is_active = true
      AND q.tram_hien_tai_id = v_tk
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;
  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn — không nhả mẻ.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi nhả sau BI âm — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ket_qua_bi = true,
    trang_thai_bi = 'AM',
    trang_thai_me = 'HOAN_THANH',
    nguoi_nha_id = p_actor_user_id,
    thoi_gian_nha = v_now,
    tk_qc_json = coalesce(tk_qc_json, '{}'::jsonb) || v_bi || jsonb_build_object(
      'trang_thai_bi', 'AM',
      'nha_sau_bi_am', true
    ),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND trang_thai_me = 'CHO_BI';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không nhả được mẻ sau BI âm.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_nhap_bi_am(uuid, uuid, uuid, jsonb) TO service_role;

-- 6) rpc_cssd_me_ket_luan_dat — assert nha_implant khi implant / bi_bat_buoc
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ket_luan_dat(
  p_me_id uuid,
  p_ghi_chu text,
  p_qc_json jsonb,
  p_ket_qua_bi boolean,
  p_ket_qua_ci boolean,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_ids uuid[];
  v_tk uuid;
  v_now timestamptz := now();
  v_n int;
  v_expect int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
  IF coalesce(v_qc->>'thong_so_vat_ly', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_ngoai_goi', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_pcd', '') IS DISTINCT FROM 'DAT' THEN
    RAISE EXCEPTION 'Nhả mẻ chỉ khi thông số vật lý, CI ngoài gói và CI PCD đều ĐẠT.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') = 'DUONG' THEN
    RAISE EXCEPTION 'BI dương — không nhả mẻ.';
  END IF;
  IF coalesce(v_qc->>'bi_bat_buoc', '') IN ('true', 't')
     AND coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'AM' THEN
    RAISE EXCEPTION 'BI bắt buộc chưa âm — không nhả mẻ.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') = 'AM' THEN
    PERFORM public.fn_cssd_me_bi_bm02_hop_le(v_qc, 'AM');
  END IF;

  BEGIN
    IF coalesce(v_qc->>'actor_user_id', '') <> '' THEN
      v_actor := (v_qc->>'actor_user_id')::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Người thực hiện không hợp lệ.';
  END;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người nhả mẻ.';
  END IF;

  -- ME-04: implant / BI bắt buộc → nha_implant (fallback qc nếu chưa seed)
  IF coalesce(v_qc->>'bi_bat_buoc', '') IN ('true', 't')
     OR coalesce(v_qc->>'co_implant', '') IN ('true', 't') THEN
    PERFORM public.fn_cssd_me_assert_nha_implant(v_actor);
  END IF;

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC — bấm «Xong máy — mở đánh giá QC» trước.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL OR coalesce(v_me.trang_thai_me, '') IN ('HOAN_THANH', 'QC_KHONG_DAT', 'CHO_BI') THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  SELECT t.id INTO v_tk
  FROM public.cssd_dm_tram t
  WHERE t.ma_tram = 'TIET_KHUAN' AND coalesce(t.is_active, true) = true
  LIMIT 1;
  IF v_tk IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạm TIỆT KHUẨN.';
  END IF;

  SELECT coalesce(array_agg(s.id), ARRAY[]::uuid[])
  INTO v_ids
  FROM (
    SELECT q.id
    FROM public.cssd_fact_quy_trinh q
    WHERE q.lo_tiet_khuan_id = p_me_id
      AND q.is_active = true
      AND q.tram_hien_tai_id = v_tk
    ORDER BY q.id
    FOR UPDATE OF q
  ) s;

  v_expect := coalesce(cardinality(v_ids), 0);
  IF v_expect = 0 THEN
    RAISE EXCEPTION 'Không có bộ đang ở trạm tiệt khuẩn trong mẻ — không kết luận ĐẠT.';
  END IF;

  v_n := public.fn_cssd_me_chuyen_bo_kho_vo_khuan(p_me_id, v_ids, v_now, p_nguoi_nhan_su_id);
  IF v_n <> v_expect THEN
    RAISE EXCEPTION 'Không cập nhật đủ bộ khi kết luận ĐẠT — thao tác đã hủy.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ket_qua_test = true,
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = v_qc,
    thoi_gian_ket_thuc = coalesce(thoi_gian_ket_thuc, v_now),
    ket_qua_bi = p_ket_qua_bi,
    ket_qua_ci = p_ket_qua_ci,
    nhiet_do = CASE
      WHEN jsonb_typeof(v_qc->'nhiet_do') = 'number' THEN (v_qc->>'nhiet_do')::numeric
      ELSE nhiet_do
    END,
    ap_suat = CASE
      WHEN jsonb_typeof(v_qc->'ap_suat') = 'number' THEN (v_qc->>'ap_suat')::numeric
      ELSE ap_suat
    END,
    thoi_gian_chu_ky = CASE
      WHEN jsonb_typeof(v_qc->'thoi_gian_chu_ky') = 'number' THEN (v_qc->>'thoi_gian_chu_ky')::integer
      ELSE thoi_gian_chu_ky
    END,
    chuong_trinh = coalesce(nullif(left(btrim(v_qc->>'chuong_trinh'), 80), ''), chuong_trinh),
    phuong_phap = coalesce(nullif(v_qc->>'phuong_phap', ''), phuong_phap),
    co_implant = CASE WHEN v_qc->>'co_implant' IN ('true', 't') THEN true ELSE co_implant END,
    trang_thai_bi = nullif(v_qc->>'trang_thai_bi', ''),
    nguoi_ket_thuc_id = coalesce(nguoi_ket_thuc_id, v_actor),
    nguoi_nha_id = v_actor,
    thoi_gian_nha = v_now,
    trang_thai_me = 'HOAN_THANH',
    nguoi_van_hanh_id = coalesce(p_nguoi_nhan_su_id, nguoi_van_hanh_id),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL
    AND tk_mo_form_qc_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'quy_trinh_ids', to_jsonb(v_ids), 'trang_thai_me', 'HOAN_THANH');
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ket_luan_dat(uuid, text, jsonb, boolean, boolean, uuid) TO service_role;

-- 7) rpc_cssd_me_ghi_cho_bi — luôn assert nha_implant
CREATE OR REPLACE FUNCTION public.rpc_cssd_me_ghi_cho_bi(
  p_me_id uuid,
  p_ghi_chu text,
  p_qc_json jsonb,
  p_ket_qua_ci boolean,
  p_nguoi_nhan_su_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_me public.cssd_fact_lo_tiet_khuan%ROWTYPE;
  v_now timestamptz := now();
  v_n int;
  v_actor uuid;
  v_qc jsonb := coalesce(p_qc_json, '{}'::jsonb);
BEGIN
  IF coalesce(v_qc->>'thong_so_vat_ly', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_ngoai_goi', '') IS DISTINCT FROM 'DAT'
     OR coalesce(v_qc->>'ci_pcd', '') IS DISTINCT FROM 'DAT' THEN
    RAISE EXCEPTION 'Chờ BI chỉ khi thông số vật lý, CI ngoài gói và CI PCD đều ĐẠT.';
  END IF;
  IF coalesce(v_qc->>'trang_thai_bi', '') IS DISTINCT FROM 'CHUA_CO' THEN
    RAISE EXCEPTION 'Trạng thái BI không phải chưa có kết quả.';
  END IF;

  BEGIN
    v_actor := (v_qc->>'actor_user_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Người thực hiện không hợp lệ.';
  END;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Không xác định được người thực hiện.';
  END IF;
  PERFORM public.fn_cssd_me_assert_nha_implant(v_actor);

  SELECT * INTO v_me
  FROM public.cssd_fact_lo_tiet_khuan
  WHERE id = p_me_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy mẻ tiệt khuẩn.';
  END IF;
  IF v_me.tk_mo_form_qc_at IS NULL THEN
    RAISE EXCEPTION 'Chưa mở bước đánh giá QC.';
  END IF;
  IF v_me.ket_qua_test IS NOT NULL OR coalesce(v_me.trang_thai_me, '') IN ('HOAN_THANH', 'QC_KHONG_DAT', 'CHO_BI') THEN
    RAISE EXCEPTION 'Mẻ đã có kết quả QC — không ghi đè.';
  END IF;

  UPDATE public.cssd_fact_lo_tiet_khuan
  SET
    ghi_chu = p_ghi_chu,
    ghi_chu_qc = p_ghi_chu,
    tk_qc_json = v_qc,
    thoi_gian_ket_thuc = coalesce(thoi_gian_ket_thuc, v_now),
    ket_qua_bi = NULL,
    ket_qua_ci = p_ket_qua_ci,
    nhiet_do = CASE WHEN jsonb_typeof(v_qc->'nhiet_do') = 'number' THEN (v_qc->>'nhiet_do')::numeric ELSE nhiet_do END,
    ap_suat = CASE WHEN jsonb_typeof(v_qc->'ap_suat') = 'number' THEN (v_qc->>'ap_suat')::numeric ELSE ap_suat END,
    thoi_gian_chu_ky = CASE WHEN jsonb_typeof(v_qc->'thoi_gian_chu_ky') = 'number' THEN (v_qc->>'thoi_gian_chu_ky')::integer ELSE thoi_gian_chu_ky END,
    chuong_trinh = coalesce(nullif(left(btrim(v_qc->>'chuong_trinh'), 80), ''), chuong_trinh),
    phuong_phap = coalesce(nullif(v_qc->>'phuong_phap', ''), phuong_phap),
    co_implant = CASE WHEN v_qc->>'co_implant' IN ('true', 't') THEN true ELSE co_implant END,
    trang_thai_bi = 'CHUA_CO',
    trang_thai_me = 'CHO_BI',
    nguoi_ket_thuc_id = coalesce(nguoi_ket_thuc_id, v_actor),
    nguoi_van_hanh_id = coalesce(p_nguoi_nhan_su_id, nguoi_van_hanh_id),
    updated_at = v_now
  WHERE id = p_me_id
    AND ket_qua_test IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Không ghi được trạng thái chờ BI.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'trang_thai_me', 'CHO_BI');
END;
$$;
REVOKE ALL ON FUNCTION public.rpc_cssd_me_ghi_cho_bi(uuid, text, jsonb, boolean, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_me_ghi_cho_bi(uuid, text, jsonb, boolean, uuid) TO service_role;
