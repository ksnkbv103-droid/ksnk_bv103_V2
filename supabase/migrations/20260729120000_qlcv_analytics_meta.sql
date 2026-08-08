-- QLCV PDCA metadata from analytics (chi_so, khoa_id, ky_do_lai). Additive jsonb.
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS analytics_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.analytics_meta IS
  'Metadata PDCA từ thống kê: { chi_so, khoa_id, ky_do_lai (YYYY-MM-DD), baseline_value? }. Không đổi CCS.';

CREATE INDEX IF NOT EXISTS idx_qlcv_fact_cong_viec_analytics_meta_chi_so
  ON public.qlcv_fact_cong_viec ((analytics_meta->>'chi_so'))
  WHERE analytics_meta ? 'chi_so';
