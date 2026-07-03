-- QLCV: fn_qlcv_ksnk_khoa_id fallback alias/tên (đồng bộ app pickKsnkKhoaFromRows).

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_qlcv_ksnk_khoa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM public.mdm_dm_khoa_phong
  WHERE is_active = true AND upper(trim(ma_khoa)) = 'KSNK'
  ORDER BY created_at
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT id INTO v_id
  FROM public.mdm_dm_khoa_phong
  WHERE is_active = true
    AND upper(trim(ma_khoa)) IN ('C18', 'KHOA_KSNK')
  ORDER BY created_at
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT id INTO v_id
  FROM public.mdm_dm_khoa_phong
  WHERE is_active = true
    AND ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'
  ORDER BY created_at
  LIMIT 1;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_qlcv_actor_is_ksnk()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mdm_nhan_su ns
    WHERE ns.auth_user_id = auth.uid()
      AND ns.is_active = true
      AND ns.khoa_id = public.fn_qlcv_ksnk_khoa_id()
  );
$$;

-- RLS policies: dùng fn_qlcv_ksnk_khoa_id() thay hardcode ma_khoa='KSNK'
DROP POLICY IF EXISTS "qlcv_select_ksnk_authenticated" ON public.qlcv_fact_cong_viec;
CREATE POLICY "qlcv_select_ksnk_authenticated"
  ON public.qlcv_fact_cong_viec
  FOR SELECT
  TO authenticated
  USING (
    khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
    AND public.fn_qlcv_can_read_fact()
  );

DROP POLICY IF EXISTS "qlcv_hd_select_ksnk_authenticated" ON public.qlcv_fact_cong_viec_hoat_dong;
CREATE POLICY "qlcv_hd_select_ksnk_authenticated"
  ON public.qlcv_fact_cong_viec_hoat_dong
  FOR SELECT
  TO authenticated
  USING (
    public.fn_qlcv_can_read_fact()
    AND EXISTS (
      SELECT 1
      FROM public.qlcv_fact_cong_viec cv
      WHERE cv.id = id_cong_viec
        AND cv.khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
    )
  );

DROP POLICY IF EXISTS "qlcv_dinh_ky_select_ksnk" ON public.qlcv_fact_cong_viec_dinh_ky;
CREATE POLICY "qlcv_dinh_ky_select_ksnk"
  ON public.qlcv_fact_cong_viec_dinh_ky
  FOR SELECT
  TO authenticated
  USING (
    public.fn_qlcv_can_read_fact()
    AND (
      khoa_thuc_hien_id = public.fn_qlcv_ksnk_khoa_id()
      OR khoa_thuc_hien_id IS NULL
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
