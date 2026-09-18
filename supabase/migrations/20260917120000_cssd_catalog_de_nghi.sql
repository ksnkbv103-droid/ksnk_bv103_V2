-- CSSD catalog change proposals (staff đề nghị → admin duyệt ghi đè master).
-- Tách khỏi cssd_fact_su_co / SET_RECONCILE sự cố.

CREATE TABLE IF NOT EXISTS public.cssd_catalog_de_nghi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL CHECK (target_kind IN ('LOAI', 'BO', 'BOM')),
  target_id uuid NULL,
  target_ma text NULL,
  target_ten text NULL,
  payload_before jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  nguoi_de_nghi_id uuid NULL REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  approved_by_id uuid NULL REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  reject_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cssd_catalog_de_nghi_status_created_idx
  ON public.cssd_catalog_de_nghi (status, created_at DESC);

CREATE INDEX IF NOT EXISTS cssd_catalog_de_nghi_target_idx
  ON public.cssd_catalog_de_nghi (target_kind, target_ma);

COMMENT ON TABLE public.cssd_catalog_de_nghi IS
  'Phiếu đề nghị sửa danh mục CSSD (loại/bộ/thành phần). NVYT tạo PENDING; admin duyệt ghi đè master.';

ALTER TABLE public.cssd_catalog_de_nghi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cssd_catalog_de_nghi_select ON public.cssd_catalog_de_nghi;
CREATE POLICY cssd_catalog_de_nghi_select ON public.cssd_catalog_de_nghi
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_has_permission('BO_DC', 'view')
    OR public.fn_sys_has_permission('DC_LE', 'view')
    OR public.fn_sys_has_permission('LOAI_DC', 'view')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'view')
  );

DROP POLICY IF EXISTS cssd_catalog_de_nghi_insert ON public.cssd_catalog_de_nghi;
CREATE POLICY cssd_catalog_de_nghi_insert ON public.cssd_catalog_de_nghi
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_has_permission('BO_DC', 'edit')
    OR public.fn_sys_has_permission('DC_LE', 'edit')
    OR public.fn_sys_has_permission('LOAI_DC', 'edit')
    OR public.fn_sys_has_permission('BO_DC', 'view')
    OR public.fn_sys_has_permission('DC_LE', 'view')
    OR public.fn_sys_has_permission('LOAI_DC', 'view')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'view')
  );

-- App duyệt chủ yếu qua admin/service client; policy update cho authenticated có edit.
DROP POLICY IF EXISTS cssd_catalog_de_nghi_update ON public.cssd_catalog_de_nghi;
CREATE POLICY cssd_catalog_de_nghi_update ON public.cssd_catalog_de_nghi
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_has_permission('DC_LE', 'edit')
    OR public.fn_sys_has_permission('BO_DC', 'edit')
  )
  WITH CHECK (
    public.fn_sys_has_permission('DC_LE', 'edit')
    OR public.fn_sys_has_permission('BO_DC', 'edit')
  );
