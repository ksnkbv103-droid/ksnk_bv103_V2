-- G-P0-07 KIEM_KE: additive ledger type. Do not apply to prod from this change set.
-- Set stock stays on v_cssd_bo_dung_cu_chi_tiet_realtime (chuẩn + sum so_luong_thay_doi, including KIEM_KE).
-- Kho lẻ live number is cssd_dm_loai_dung_cu.so_luong_kho_du_phong (absolute after count).
-- A KIEM_KE row with bo_dung_cu_id NULL is the kho event only — do not add it on top of that column.
-- KIEM_KE does not rewrite Loại / Bộ / BOM and must not carry su_co_id.

ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS fact_kho_dung_cu_giao_dich_loai_giao_dich_check;

ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT fact_kho_dung_cu_giao_dich_loai_giao_dich_check
  CHECK (
    loai_giao_dich = ANY (
      ARRAY[
        'NHAP_KHO'::text,
        'BAO_HONG'::text,
        'BAO_MAT'::text,
        'BO_SUNG'::text,
        'DIEU_CHUYEN'::text,
        'KIEM_KE'::text
      ]
    )
  );

ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS cssd_fact_kho_giao_dich_kiem_ke_no_su_co;

ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT cssd_fact_kho_giao_dich_kiem_ke_no_su_co
  CHECK (loai_giao_dich <> 'KIEM_KE' OR su_co_id IS NULL);

CREATE OR REPLACE FUNCTION public.rpc_cssd_post_kiem_ke(
  p_bo_dung_cu_id uuid,
  p_lines jsonb,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_line jsonb;
  v_loai uuid;
  v_dem integer;
  v_kho_dem integer;
  v_thuc integer;
  v_kho integer;
  v_delta integer;
  v_posted integer := 0;
  v_seen uuid[] := ARRAY[]::uuid[];
  v_component_count integer;
  v_stocks json;
  v_plan jsonb := '[]'::jsonb;
  v_item jsonb;
  v_has_kho boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Chưa đăng nhập.');
    END IF;
    IF NOT (
      public.fn_sys_is_admin()
      OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
      OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Không đủ quyền ghi kiểm kê.');
    END IF;
  END IF;

  IF p_bo_dung_cu_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.cssd_dm_bo_dung_cu b
    WHERE b.id = p_bo_dung_cu_id AND b.is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ.');
  END IF;

  SELECT count(*)::integer INTO v_component_count
  FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime c
  WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND c.is_active = true;

  IF v_component_count = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Bộ chưa có thành phần. Kiểm kê không tạo danh mục.');
  END IF;

  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RETURN json_build_object('success', false, 'message', 'Phiếu kiểm kê không hợp lệ.');
  END IF;
  IF jsonb_array_length(p_lines) <> v_component_count THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phiếu kiểm kê phải có một số đếm cho mỗi thành phần của bộ.'
    );
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) AS t(value)
  LOOP
    IF COALESCE(v_line->>'loai_dung_cu_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN json_build_object('success', false, 'message', 'Mã loại không hợp lệ.');
    END IF;
    v_loai := (v_line->>'loai_dung_cu_id')::uuid;

    IF v_loai IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Thiếu loại dụng cụ.');
    END IF;
    IF v_loai = ANY (v_seen) THEN
      RETURN json_build_object('success', false, 'message', 'Trùng loại trên cùng phiếu kiểm kê.');
    END IF;
    v_seen := v_seen || v_loai;

    SELECT c.so_luong_thuc_te, COALESCE(l.so_luong_kho_du_phong, 0)
      INTO v_thuc, v_kho
    FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime c
    JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
    WHERE c.bo_dung_cu_id = p_bo_dung_cu_id
      AND c.loai_dung_cu_id = v_loai
      AND c.is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'Dòng không thuộc bộ. Kiểm kê không thêm thành phần.');
    END IF;

    IF COALESCE(v_line->>'so_luong_dem', '') !~ '^[0-9]+$' THEN
      RETURN json_build_object('success', false, 'message', 'Số đếm bộ phải là số nguyên không âm.');
    END IF;
    v_dem := (v_line->>'so_luong_dem')::integer;

    v_delta := v_dem - COALESCE(v_thuc, 0);
    v_has_kho := v_line ? 'kho_dem' AND NULLIF(v_line->>'kho_dem', '') IS NOT NULL;
    IF v_has_kho THEN
      IF COALESCE(v_line->>'kho_dem', '') !~ '^[0-9]+$' THEN
        RETURN json_build_object('success', false, 'message', 'Số đếm kho lẻ phải là số nguyên không âm.');
      END IF;
      v_kho_dem := (v_line->>'kho_dem')::integer;
    ELSE
      v_kho_dem := NULL;
    END IF;

    v_plan := v_plan || jsonb_build_array(jsonb_build_object(
      'loai', v_loai,
      'dem', v_dem,
      'thuc', COALESCE(v_thuc, 0),
      'delta_bo', v_delta,
      'kho', COALESCE(v_kho, 0),
      'kho_dem', CASE WHEN v_has_kho THEN to_jsonb(v_kho_dem) ELSE 'null'::jsonb END
    ));
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_plan) AS t(value)
  LOOP
    v_loai := (v_item->>'loai')::uuid;
    v_dem := (v_item->>'dem')::integer;
    v_thuc := (v_item->>'thuc')::integer;
    v_delta := (v_item->>'delta_bo')::integer;
    v_kho := (v_item->>'kho')::integer;

    IF v_delta <> 0 THEN
      INSERT INTO public.cssd_fact_kho_giao_dich (
        loai_dung_cu_id, bo_dung_cu_id, loai_giao_dich, so_luong_thay_doi,
        ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
      ) VALUES (
        v_loai, p_bo_dung_cu_id, 'KIEM_KE', v_delta,
        format('Kiểm kê bộ: đếm %s (hệ thống %s).', v_dem, v_thuc),
        NULL, p_nguoi_thuc_hien_id, now(), now()
      );
      v_posted := v_posted + 1;
    END IF;

    IF v_item->>'kho_dem' IS NOT NULL AND v_item->'kho_dem' <> 'null'::jsonb THEN
      v_kho_dem := (v_item->>'kho_dem')::integer;
      IF v_kho_dem <> v_kho THEN
        UPDATE public.cssd_dm_loai_dung_cu
           SET so_luong_kho_du_phong = v_kho_dem,
               updated_at = now()
         WHERE id = v_loai;
        INSERT INTO public.cssd_fact_kho_giao_dich (
          loai_dung_cu_id, bo_dung_cu_id, loai_giao_dich, so_luong_thay_doi,
          ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
        ) VALUES (
          v_loai, NULL, 'KIEM_KE', v_kho_dem - v_kho,
          format('Kiểm kê kho lẻ: đếm %s (hệ thống %s).', v_kho_dem, v_kho),
          NULL, p_nguoi_thuc_hien_id, now(), now()
        );
        v_posted := v_posted + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.cssd_dm_bo_dung_cu
     SET ngay_kiem_ke_gan_nhat = now(),
         updated_at = now()
   WHERE id = p_bo_dung_cu_id;

  SELECT json_agg(json_build_object(
    'loai_dung_cu_id', c.loai_dung_cu_id,
    'ton_bo', c.so_luong_thuc_te,
    'ton_kho', COALESCE(l.so_luong_kho_du_phong, 0),
    'ton_trong_bo', COALESCE(s.tong, 0),
    'ton_loai', COALESCE(s.tong, 0) + COALESCE(l.so_luong_kho_du_phong, 0)
  ))
  INTO v_stocks
  FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime c
  JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
  LEFT JOIN (
    SELECT loai_dung_cu_id, sum(so_luong_thuc_te)::integer AS tong
    FROM public.v_cssd_bo_dung_cu_chi_tiet_realtime
    WHERE is_active = true AND loai_dung_cu_id = ANY (v_seen)
    GROUP BY loai_dung_cu_id
  ) s ON s.loai_dung_cu_id = c.loai_dung_cu_id
  WHERE c.bo_dung_cu_id = p_bo_dung_cu_id AND c.is_active = true;

  RETURN json_build_object('success', true, 'posted', v_posted, 'lines', COALESCE(v_stocks, '[]'::json));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_cssd_post_kiem_ke(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_post_kiem_ke(uuid, jsonb, uuid) TO authenticated, service_role;
