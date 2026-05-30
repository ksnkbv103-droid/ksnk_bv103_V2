-- Migration: Convert fact_su_co EAV details to Hybrid JSONB
-- Date: 21/05/2026

-- 1. Add attributes jsonb column with default '{}' to fact_su_co
ALTER TABLE public.fact_su_co ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2. Migrate historical data from EAV fact_su_co_chi_tiet to attributes jsonb
WITH aggregated AS (
  SELECT 
    su_co_id, 
    jsonb_object_agg(ma_chi_tiet_su_co, gia_tri_chi_tiet) AS attrs
  FROM public.fact_su_co_chi_tiet
  GROUP BY su_co_id
)
UPDATE public.fact_su_co sc
SET attributes = aggregated.attrs
FROM aggregated
WHERE sc.id = aggregated.su_co_id;

-- 3. Drop legacy EAV table fact_su_co_chi_tiet (cascading any views/constraints)
DROP TABLE IF EXISTS public.fact_su_co_chi_tiet CASCADE;

-- 4. Recreate v_fact_su_co_full view exposing the attributes column
CREATE OR REPLACE VIEW public.v_fact_su_co_full WITH (security_invoker='true') AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.name AS ten_loai_su_co,
    sc.incident_group,
    sc.incident_type_label,
    COALESCE(NULLIF(concat(sc.incident_group, ':', sc.incident_type_label), ':'::text), ls.code) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at,
    sc.attributes
   FROM (public.fact_su_co sc
     LEFT JOIN public.dm_lookup_value ls ON ((ls.id = sc.loai_su_co_id AND ls.category_type = 'LOAI_SU_CO')));

-- 5. Create GIN index on attributes column for optimized dynamic query paths
CREATE INDEX IF NOT EXISTS idx_su_co_attributes ON public.fact_su_co USING gin (attributes jsonb_path_ops);

-- 6. Create BTREE expression indexes for highly frequented query attributes
CREATE INDEX IF NOT EXISTS idx_su_co_attr_incident_group ON public.fact_su_co USING btree ((attributes->>'INCIDENT_GROUP'));
CREATE INDEX IF NOT EXISTS idx_su_co_attr_rollback_target ON public.fact_su_co USING btree ((attributes->>'ROLLBACK_TARGET_STATION'));

COMMENT ON COLUMN public.fact_su_co.attributes IS 'Chứa toàn bộ các thuộc tính động mở rộng của sự cố dưới dạng JSONB (thay thế EAV)';
