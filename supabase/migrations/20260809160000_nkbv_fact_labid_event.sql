-- LabID Event NHSN (W3) — tách khỏi cờ MDRO vận hành trên nkbv_fact_vi_sinh.

CREATE TABLE IF NOT EXISTS public.nkbv_fact_labid_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL,
  ma_benh_nhan text,
  vi_sinh_id uuid REFERENCES public.nkbv_fact_vi_sinh(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  phenotype text NOT NULL,
  organism_category text NOT NULL,
  specimen_class text NOT NULL,
  collection_date date NOT NULL,
  is_event boolean NOT NULL DEFAULT true,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT nkbv_fact_labid_event_specimen_chk CHECK (
    specimen_class IN ('BLOOD', 'STOOL', 'OTHER')
  )
);

COMMENT ON TABLE public.nkbv_fact_labid_event IS
  'LabID Event NHSN (MRSA/VRE/CRE/CDI…) — không dùng IWP/DOE lâm sàng.';

CREATE INDEX IF NOT EXISTS idx_nkbv_labid_ba_date
  ON public.nkbv_fact_labid_event (ma_benh_an, collection_date DESC)
  WHERE is_active = true AND is_event = true;

CREATE INDEX IF NOT EXISTS idx_nkbv_labid_phenotype_window
  ON public.nkbv_fact_labid_event (ma_benh_an, phenotype, collection_date)
  WHERE is_active = true AND is_event = true;

ALTER TABLE public.nkbv_fact_labid_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_labid_event_select ON public.nkbv_fact_labid_event;
DROP POLICY IF EXISTS nkbv_fact_labid_event_insert ON public.nkbv_fact_labid_event;
DROP POLICY IF EXISTS nkbv_fact_labid_event_update ON public.nkbv_fact_labid_event;

CREATE POLICY nkbv_fact_labid_event_select ON public.nkbv_fact_labid_event
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_labid_event_insert ON public.nkbv_fact_labid_event
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_labid_event_update ON public.nkbv_fact_labid_event
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));

GRANT SELECT, INSERT, UPDATE ON public.nkbv_fact_labid_event TO authenticated;
GRANT ALL ON public.nkbv_fact_labid_event TO service_role;
