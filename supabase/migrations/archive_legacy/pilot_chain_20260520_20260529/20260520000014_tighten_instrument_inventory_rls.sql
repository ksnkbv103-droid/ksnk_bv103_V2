-- Revoke overly permissive anon grants from 000013; align with authenticated RLS pattern.

REVOKE ALL ON TABLE public.dm_bo_dung_cu_phan_bo FROM anon;
REVOKE ALL ON TABLE public.fact_kho_dung_cu_giao_dich FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.dm_bo_dung_cu_phan_bo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fact_kho_dung_cu_giao_dich TO authenticated;

DROP POLICY IF EXISTS dm_bo_dung_cu_phan_bo_select_auth ON public.dm_bo_dung_cu_phan_bo;
DROP POLICY IF EXISTS dm_bo_dung_cu_phan_bo_all_auth ON public.dm_bo_dung_cu_phan_bo;
DROP POLICY IF EXISTS fact_kho_dung_cu_giao_dich_select_auth ON public.fact_kho_dung_cu_giao_dich;
DROP POLICY IF EXISTS fact_kho_dung_cu_giao_dich_all_auth ON public.fact_kho_dung_cu_giao_dich;

CREATE POLICY dm_bo_dung_cu_phan_bo_select_auth
  ON public.dm_bo_dung_cu_phan_bo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY dm_bo_dung_cu_phan_bo_all_auth
  ON public.dm_bo_dung_cu_phan_bo
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY fact_kho_dung_cu_giao_dich_select_auth
  ON public.fact_kho_dung_cu_giao_dich
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY fact_kho_dung_cu_giao_dich_all_auth
  ON public.fact_kho_dung_cu_giao_dich
  TO authenticated
  USING (true)
  WITH CHECK (true);
