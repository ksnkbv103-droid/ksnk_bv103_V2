-- CSSD báo cáo sự cố: SSOT attributes JSONB → generated columns + view reconcile
-- Không dual-write từ app; index filter theo nhóm (CHEMICAL / EQUIPMENT panels).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cssd_fact_su_co'
      AND column_name = 'incident_group'
  ) THEN
    ALTER TABLE public.cssd_fact_su_co
      ADD COLUMN incident_group text GENERATED ALWAYS AS (
        COALESCE(attributes ->> 'INCIDENT_GROUP', attributes ->> 'incident_group')
      ) STORED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cssd_fact_su_co'
      AND column_name = 'incident_type_label'
  ) THEN
    ALTER TABLE public.cssd_fact_su_co
      ADD COLUMN incident_type_label text GENERATED ALWAYS AS (
        COALESCE(attributes ->> 'INCIDENT_TYPE_LABEL', attributes ->> 'incident_type_label')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cssd_su_co_incident_group
  ON public.cssd_fact_su_co (incident_group)
  WHERE incident_group IS NOT NULL;

-- Legacy auto-mẻ: bổ sung nhãn loại trong attributes nếu thiếu
UPDATE public.cssd_fact_su_co
SET attributes = attributes || jsonb_build_object(
  'INCIDENT_TYPE_LABEL',
  COALESCE(
    NULLIF(attributes ->> 'INCIDENT_TYPE_LABEL', ''),
    NULLIF(attributes ->> 'incident_type_label', ''),
    'Chất lượng tiệt khuẩn / mẻ không đạt'
  )
)
WHERE COALESCE(attributes ->> 'INCIDENT_GROUP', attributes ->> 'incident_group') = 'PROCESS'
  AND COALESCE(attributes ->> 'INCIDENT_TYPE_LABEL', attributes ->> 'incident_type_label', '') = ''
  AND mo_ta ILIKE '%mẻ tiệt khuẩn%';

CREATE OR REPLACE VIEW public.v_cssd_su_co_full WITH (security_invoker = true) AS
SELECT
  sc.id,
  sc.quy_trinh_id,
  sc.ma_qr_quy_trinh,
  sc.ma_tram_phat_hien,
  sc.loai_su_co_id,
  ls.name AS ten_loai_su_co,
  COALESCE(
    sc.incident_group,
    sc.attributes ->> 'INCIDENT_GROUP',
    sc.attributes ->> 'incident_group'
  ) AS incident_group,
  COALESCE(
    sc.incident_type_label,
    sc.attributes ->> 'INCIDENT_TYPE_LABEL',
    sc.attributes ->> 'incident_type_label'
  ) AS incident_type_label,
  COALESCE(
    NULLIF(
      concat(
        COALESCE(sc.incident_group, sc.attributes ->> 'INCIDENT_GROUP', sc.attributes ->> 'incident_group'),
        ':',
        COALESCE(sc.incident_type_label, sc.attributes ->> 'INCIDENT_TYPE_LABEL', sc.attributes ->> 'incident_type_label')
      ),
      ':'
    ),
    ls.code
  ) AS ma_loai_su_co,
  sc.mo_ta,
  sc.is_red_alert,
  sc.ma_tram_gay_loi,
  sc.created_at,
  sc.attributes
FROM public.cssd_fact_su_co sc
LEFT JOIN public.sys_lookup_value ls
  ON ls.id = sc.loai_su_co_id AND ls.category_type = 'LOAI_SU_CO';
