-- Restore NKBV device registry + LabID event on cloud.
-- History listed 20260804190000 / 20260809160000 as applied, but tables were
-- absent on ksnk-bv103-prod after remote-only 20260826/20260827. Additive IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.nkbv_fact_device_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL,
  ma_benh_nhan text,
  device_type text NOT NULL,
  insertion_date date NOT NULL,
  removal_date date,
  first_access_date date,
  line_type text,
  khoa_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT nkbv_fact_device_registry_type_chk CHECK (
    device_type IN ('CENTRAL_LINE', 'FOLEY', 'VENTILATOR')
  ),
  CONSTRAINT nkbv_fact_device_registry_dates_chk CHECK (
    removal_date IS NULL OR removal_date >= insertion_date
  )
);

COMMENT ON TABLE public.nkbv_fact_device_registry IS
  'NKBV Device Registry — longitudinal CVC/Foley/Vent per stay (SSOT §1.2).';
COMMENT ON COLUMN public.nkbv_fact_device_registry.first_access_date IS
  'CLABSI: first inpatient access; device-day count starts here when set.';

CREATE INDEX IF NOT EXISTS idx_nkbv_device_reg_ma_ba
  ON public.nkbv_fact_device_registry (ma_benh_an)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nkbv_device_reg_khoa_dates
  ON public.nkbv_fact_device_registry (khoa_id, insertion_date)
  WHERE is_active = true;

CREATE OR REPLACE VIEW public.fact_nkbv_device_registry
WITH (security_invoker = true) AS
SELECT
  id,
  ma_benh_an,
  ma_benh_nhan,
  device_type,
  insertion_date,
  removal_date,
  first_access_date,
  line_type,
  khoa_id,
  is_active,
  notes,
  metadata,
  created_at,
  updated_at
FROM public.nkbv_fact_device_registry;

ALTER TABLE public.nkbv_fact_device_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_device_registry_select ON public.nkbv_fact_device_registry;
DROP POLICY IF EXISTS nkbv_fact_device_registry_insert ON public.nkbv_fact_device_registry;
DROP POLICY IF EXISTS nkbv_fact_device_registry_update ON public.nkbv_fact_device_registry;
DROP POLICY IF EXISTS nkbv_fact_device_registry_delete ON public.nkbv_fact_device_registry;

CREATE POLICY nkbv_fact_device_registry_select ON public.nkbv_fact_device_registry
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_device_registry_insert ON public.nkbv_fact_device_registry
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_device_registry_update ON public.nkbv_fact_device_registry
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_device_registry_delete ON public.nkbv_fact_device_registry
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_device_registry TO authenticated;
GRANT ALL ON public.nkbv_fact_device_registry TO service_role;
GRANT SELECT ON public.fact_nkbv_device_registry TO authenticated;

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
DROP POLICY IF EXISTS nkbv_fact_labid_event_delete ON public.nkbv_fact_labid_event;

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
CREATE POLICY nkbv_fact_labid_event_delete ON public.nkbv_fact_labid_event
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_labid_event TO authenticated;
GRANT ALL ON public.nkbv_fact_labid_event TO service_role;
