-- Backfill criteria_key cho mốc CĐHA cũ (NULL) → imaging_chest,
-- rồi dedupe lại theo unique (BA, ngày, criteria_key) để hết XQ lặp.

UPDATE public.nkbv_fact_ba_timeline
SET criteria_key = 'imaging_chest',
    updated_at = timezone('utc'::text, now())
WHERE is_active = true
  AND criteria_key IS NULL
  AND (
    milestone_kind = 'IMAGING_CHEST'
    OR title ILIKE '%x-quang%'
    OR title ILIKE '%xq%'
    OR title ILIKE '%ct ngực%'
    OR title ILIKE '%ct nguc%'
  );

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY ma_benh_an, milestone_date, criteria_key
           ORDER BY updated_at DESC, id DESC
         ) AS rn
  FROM public.nkbv_fact_ba_timeline
  WHERE is_active = true AND criteria_key IS NOT NULL
)
UPDATE public.nkbv_fact_ba_timeline t
SET is_active = false,
    updated_at = timezone('utc'::text, now())
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;
