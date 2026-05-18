-- RLS bổ sung: authenticated đọc fact CSSD + dm_tram (ghi vẫn qua service role sau verifyPermission app).

ALTER TABLE public.dm_tram_cssd ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_tram_cssd_select_authenticated ON public.dm_tram_cssd;
CREATE POLICY dm_tram_cssd_select_authenticated ON public.dm_tram_cssd
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fact_quy_trinh_select_authenticated ON public.fact_quy_trinh;
CREATE POLICY fact_quy_trinh_select_authenticated ON public.fact_quy_trinh
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fact_quy_trinh_thanh_phan_select_authenticated ON public.fact_quy_trinh_thanh_phan;
CREATE POLICY fact_quy_trinh_thanh_phan_select_authenticated ON public.fact_quy_trinh_thanh_phan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fact_lo_tiet_khuan_select_authenticated ON public.fact_lo_tiet_khuan;
CREATE POLICY fact_lo_tiet_khuan_select_authenticated ON public.fact_lo_tiet_khuan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fact_nhat_ky_quet_select_authenticated ON public.fact_nhat_ky_quet;
CREATE POLICY fact_nhat_ky_quet_select_authenticated ON public.fact_nhat_ky_quet
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS fact_su_co_select_authenticated ON public.fact_su_co;
CREATE POLICY fact_su_co_select_authenticated ON public.fact_su_co
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS mdm_nhan_su_select_authenticated ON public.mdm_nhan_su;
CREATE POLICY mdm_nhan_su_select_authenticated ON public.mdm_nhan_su
  FOR SELECT TO authenticated USING (true);
