-- Migration: Convert dm_tieu_chi_bang_kiem EAV results to Hybrid JSONB in dm_bang_kiem
-- Date: 22/05/2026

-- 1. Add tieu_chi_jsonb column with default '[]'::jsonb to dm_bang_kiem
ALTER TABLE public.dm_bang_kiem ADD COLUMN IF NOT EXISTS tieu_chi_jsonb jsonb DEFAULT '[]'::jsonb NOT NULL;

-- 2. Migrate historical data from EAV dm_tieu_chi_bang_kiem to tieu_chi_jsonb
WITH aggregated AS (
  SELECT 
    bang_kiem_id, 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'ma_tc', ma_tc,
        'stt', stt,
        'noi_dung', noi_dung,
        'ghi_chu', ghi_chu,
        'is_active', COALESCE(is_active, true),
        'created_at', created_at,
        'updated_at', updated_at,
        'diem_toi_da', COALESCE(diem_toi_da, 1)
      ) ORDER BY stt ASC
    ) AS criteria
  FROM public.dm_tieu_chi_bang_kiem
  GROUP BY bang_kiem_id
)
UPDATE public.dm_bang_kiem bk
SET tieu_chi_jsonb = aggregated.criteria
FROM aggregated
WHERE bk.id = aggregated.bang_kiem_id;

-- 3. Drop legacy EAV table dm_tieu_chi_bang_kiem (cascading dependent views/constraints)
DROP TABLE IF EXISTS public.dm_tieu_chi_bang_kiem CASCADE;

-- 4. Create backward-compatible View dm_tieu_chi_bang_kiem that unpacks tieu_chi_jsonb dynamically
CREATE OR REPLACE VIEW public.dm_tieu_chi_bang_kiem WITH (security_invoker='true') AS
 SELECT 
    (r.elem->>'id')::uuid AS id,
    r.elem->>'ma_tc' AS ma_tc,
    s.id AS bang_kiem_id,
    (r.elem->>'stt')::integer AS stt,
    r.elem->>'noi_dung' AS noi_dung,
    r.elem->>'ghi_chu' AS ghi_chu,
    COALESCE((r.elem->>'is_active')::boolean, true) AS is_active,
    COALESCE((r.elem->>'created_at')::timestamp with time zone, s.created_at) AS created_at,
    COALESCE((r.elem->>'updated_at')::timestamp with time zone, s.updated_at) AS updated_at,
    COALESCE((r.elem->>'diem_toi_da')::integer, 1) AS diem_toi_da
   FROM public.dm_bang_kiem s,
        LATERAL jsonb_array_elements(s.tieu_chi_jsonb) r(elem);

-- 5. Recreate View v_dm_tieu_chi_bang_kiem_full (points to the backward-compatible View dm_tieu_chi_bang_kiem)
CREATE OR REPLACE VIEW public.v_dm_tieu_chi_bang_kiem_full WITH (security_invoker='true') AS
 SELECT tc.id,
    tc.bang_kiem_id,
    bk.ma_bk AS ma_bang_kiem,
    bk.ten_bang_kiem,
    tc.noi_dung,
    tc.stt,
    tc.diem_toi_da,
    tc.is_active,
    tc.created_at,
    tc.updated_at
   FROM (public.dm_tieu_chi_bang_kiem tc
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = tc.bang_kiem_id)));

COMMENT ON COLUMN public.dm_bang_kiem.tieu_chi_jsonb IS 'Danh sách mảng các tiêu chí kiểm tra dưới dạng JSONB (thay thế EAV)';
