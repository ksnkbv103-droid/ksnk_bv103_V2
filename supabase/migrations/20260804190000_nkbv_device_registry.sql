-- NKBV Device Registry (SSOT §1.2) — additive; W1 foundation.
-- Day-count: Foley/Vent from insertion_date; Central line from COALESCE(first_access_date, insertion_date).

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
GRANT SELECT ON public.fact_nkbv_device_registry TO authenticated;
