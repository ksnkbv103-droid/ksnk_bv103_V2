-- DRAFT / LOCAL FIRST — do NOT apply to linked / production yet.
-- ADR: docs/core/adr-cssd-fact-write-rls.md
-- Pattern mirror: 20260603160000 lifecycle_event + 20260824120000 su_co write.
-- App vẫn ghi qua createAdminSupabaseClient sau verifyPermission; policy chặn user client không quyền.
-- Go-live: ops-go-live.md §7 — chỉ apply khi PO duyệt + local verify pass.

-- cssd_fact_quy_trinh (SELECT giữ nguyên từ 20260603160000)
DROP POLICY IF EXISTS cssd_fact_quy_trinh_insert ON public.cssd_fact_quy_trinh;
CREATE POLICY cssd_fact_quy_trinh_insert ON public.cssd_fact_quy_trinh
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_has_permission('CSSD_WORKFLOW', 'create')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'create')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'import')
  );

DROP POLICY IF EXISTS cssd_fact_quy_trinh_update ON public.cssd_fact_quy_trinh;
CREATE POLICY cssd_fact_quy_trinh_update ON public.cssd_fact_quy_trinh
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
    OR public.fn_sys_has_permission('BAO_SU_CO', 'create')
  )
  WITH CHECK (
    public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
    OR public.fn_sys_has_permission('BAO_SU_CO', 'create')
  );

-- cssd_fact_lo_tiet_khuan (SELECT giữ nguyên từ 20260603160000)
DROP POLICY IF EXISTS cssd_fact_lo_tiet_khuan_insert ON public.cssd_fact_lo_tiet_khuan;
CREATE POLICY cssd_fact_lo_tiet_khuan_insert ON public.cssd_fact_lo_tiet_khuan
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  );

DROP POLICY IF EXISTS cssd_fact_lo_tiet_khuan_update ON public.cssd_fact_lo_tiet_khuan;
CREATE POLICY cssd_fact_lo_tiet_khuan_update ON public.cssd_fact_lo_tiet_khuan
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  )
  WITH CHECK (
    public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  );

