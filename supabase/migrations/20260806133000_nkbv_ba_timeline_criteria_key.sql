-- Gắn mốc timeline với khóa tiêu chuẩn CDC (imaging / triệu chứng / …).

ALTER TABLE public.nkbv_fact_ba_timeline
  ADD COLUMN IF NOT EXISTS criteria_key text;

COMMENT ON COLUMN public.nkbv_fact_ba_timeline.criteria_key IS
  'Khóa yếu tố tiêu chuẩn CDC (imaging_chest, fever_or_wbc, …) — bằng chứng cho cổng phải.';

CREATE INDEX IF NOT EXISTS idx_nkbv_ba_timeline_criteria
  ON public.nkbv_fact_ba_timeline (ma_benh_an, criteria_key)
  WHERE is_active = true AND criteria_key IS NOT NULL;
