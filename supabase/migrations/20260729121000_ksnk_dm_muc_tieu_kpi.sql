-- Mục tiêu KPI chuẩn viện (CCS/VST/GSC) — khoa_id NULL = toàn viện.
CREATE TABLE IF NOT EXISTS public.ksnk_dm_muc_tieu_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL CHECK (metric_key IN ('ty_le_ccs', 'ty_le_vst', 'ty_le_gsc')),
  khoa_id uuid NULL REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE CASCADE,
  target_pct numeric(5,1) NOT NULL CHECK (target_pct >= 0 AND target_pct <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ksnk_dm_muc_tieu_kpi_metric_khoa
  ON public.ksnk_dm_muc_tieu_kpi (metric_key, COALESCE(khoa_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE is_active;

COMMENT ON TABLE public.ksnk_dm_muc_tieu_kpi IS
  'Mục tiêu % tuân thủ (CCS/VST/GSC). khoa_id NULL = toàn viện. Không gộp NKBV/CSSD.';

-- Seed mặc định toàn viện = ngưỡng GREEN_MIN pilot (85).
INSERT INTO public.ksnk_dm_muc_tieu_kpi (metric_key, khoa_id, target_pct)
SELECT v.metric_key, NULL, 85.0
FROM (VALUES ('ty_le_ccs'), ('ty_le_vst'), ('ty_le_gsc')) AS v(metric_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ksnk_dm_muc_tieu_kpi t
  WHERE t.metric_key = v.metric_key AND t.khoa_id IS NULL AND t.is_active
);

ALTER TABLE public.ksnk_dm_muc_tieu_kpi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ksnk_dm_muc_tieu_kpi_select ON public.ksnk_dm_muc_tieu_kpi;
CREATE POLICY ksnk_dm_muc_tieu_kpi_select ON public.ksnk_dm_muc_tieu_kpi
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS ksnk_dm_muc_tieu_kpi_write_admin ON public.ksnk_dm_muc_tieu_kpi;
CREATE POLICY ksnk_dm_muc_tieu_kpi_write_admin ON public.ksnk_dm_muc_tieu_kpi
  FOR ALL TO authenticated
  USING (public.fn_sys_has_permission('QUAN_TRI_HE_THONG', 'edit') OR public.is_admin_user())
  WITH CHECK (public.fn_sys_has_permission('QUAN_TRI_HE_THONG', 'edit') OR public.is_admin_user());

GRANT SELECT ON public.ksnk_dm_muc_tieu_kpi TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.ksnk_dm_muc_tieu_kpi TO authenticated, service_role;
