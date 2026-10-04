-- Hotfix: fn_get_session_stype JOIN nhầm dm_khoa_phong (đã DROP alias).
-- Bảng SSOT: mdm_dm_khoa_phong. Không đụng fact VST/GSC.

CREATE OR REPLACE FUNCTION public.fn_get_session_stype(
  p_nguoi_giam_sat_id uuid,
  p_target_khoa_id uuid
) RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_ns_khoa_id uuid;
  v_ns_ma_khoa text;
  v_ns_ten_khoa text;
  v_t_ma_khoa text;
  v_t_ten_khoa text;
  v_stype text;
  v_is_ns_ksnk boolean := false;
  v_is_t_ksnk boolean := false;
BEGIN
  IF p_nguoi_giam_sat_id IS NOT NULL THEN
    SELECT ns.khoa_id, k.ma_khoa, k.ten_khoa
    INTO v_ns_khoa_id, v_ns_ma_khoa, v_ns_ten_khoa
    FROM public.mdm_nhan_su ns
    LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
    WHERE ns.id = p_nguoi_giam_sat_id;
  END IF;

  IF p_target_khoa_id IS NOT NULL THEN
    SELECT k.ma_khoa, k.ten_khoa
    INTO v_t_ma_khoa, v_t_ten_khoa
    FROM public.mdm_dm_khoa_phong k
    WHERE k.id = p_target_khoa_id;
  END IF;

  v_is_ns_ksnk := (
    v_ns_ma_khoa IN ('KSNK', 'C18')
    OR v_ns_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'
    OR EXISTS (
      SELECT 1 FROM public.sys_lookup_value
      WHERE category_type = 'KHOA_KSNK_CONFIG'
        AND is_active = true
        AND (code = v_ns_ma_khoa OR name = v_ns_ten_khoa)
    )
  );

  v_is_t_ksnk := (
    v_t_ma_khoa IN ('KSNK', 'C18')
    OR v_t_ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'
    OR EXISTS (
      SELECT 1 FROM public.sys_lookup_value
      WHERE category_type = 'KHOA_KSNK_CONFIG'
        AND is_active = true
        AND (code = v_t_ma_khoa OR name = v_t_ten_khoa)
    )
  );

  -- Lock A: KSNK supervisor → always KSNK lens (never TGS / CHEO).
  IF v_is_ns_ksnk THEN
    v_stype := 'KSNK';
  ELSIF v_ns_khoa_id IS NOT NULL AND p_target_khoa_id = v_ns_khoa_id THEN
    v_stype := 'TU_GIAM_SAT';
  ELSIF v_ns_khoa_id IS NULL AND p_nguoi_giam_sat_id IS NULL THEN
    IF p_target_khoa_id IS NULL OR NOT v_is_t_ksnk THEN
      v_stype := 'KSNK';
    ELSE
      v_stype := 'TU_GIAM_SAT';
    END IF;
  ELSE
    v_stype := 'CHEO';
  END IF;

  RETURN v_stype;
END;
$$;
