-- R-41: Thắt RLS cssd_fact_* từ authenticated-wide → fn_sys_has_permission (CSSD modules)
-- Pilot: ADMIN bypass qua fn_sys_has_permission / role ADMIN trong hàm.

-- cssd_fact_quy_trinh
DROP POLICY IF EXISTS fact_quy_trinh_select_authenticated ON public.cssd_fact_quy_trinh;
CREATE POLICY cssd_fact_quy_trinh_select ON public.cssd_fact_quy_trinh
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'));

-- cssd_fact_quy_trinh_thanh_phan
DROP POLICY IF EXISTS fact_quy_trinh_thanh_phan_select_authenticated ON public.cssd_fact_quy_trinh_thanh_phan;
CREATE POLICY cssd_fact_quy_trinh_thanh_phan_select ON public.cssd_fact_quy_trinh_thanh_phan
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'));

DROP POLICY IF EXISTS cssd_fact_lifecycle_event_all_authenticated ON public.cssd_fact_lifecycle_event;
DROP POLICY IF EXISTS cssd_fact_lifecycle_event_select_authenticated ON public.cssd_fact_lifecycle_event;
CREATE POLICY cssd_fact_lifecycle_event_select ON public.cssd_fact_lifecycle_event
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'));
CREATE POLICY cssd_fact_lifecycle_event_insert ON public.cssd_fact_lifecycle_event
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit'));
CREATE POLICY cssd_fact_lifecycle_event_update ON public.cssd_fact_lifecycle_event
  FOR UPDATE TO authenticated
  USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit'))
  WITH CHECK (public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit'));

-- cssd_fact_lo_tiet_khuan
DROP POLICY IF EXISTS fact_lo_tiet_khuan_select_authenticated ON public.cssd_fact_lo_tiet_khuan;
CREATE POLICY cssd_fact_lo_tiet_khuan_select ON public.cssd_fact_lo_tiet_khuan
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'view'));

-- cssd_fact_su_co
DROP POLICY IF EXISTS fact_su_co_select_authenticated ON public.cssd_fact_su_co;
CREATE POLICY cssd_fact_su_co_select ON public.cssd_fact_su_co
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'));

-- cssd_fact_kho (inventory)
DROP POLICY IF EXISTS cssd_fact_kho_chi_tiet_all_authenticated ON public.cssd_fact_kho_chi_tiet;
DROP POLICY IF EXISTS cssd_fact_kho_chi_tiet_select_authenticated ON public.cssd_fact_kho_chi_tiet;
CREATE POLICY cssd_fact_kho_chi_tiet_select ON public.cssd_fact_kho_chi_tiet
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view'));
CREATE POLICY cssd_fact_kho_chi_tiet_insert ON public.cssd_fact_kho_chi_tiet
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit'));
CREATE POLICY cssd_fact_kho_chi_tiet_update ON public.cssd_fact_kho_chi_tiet
  FOR UPDATE TO authenticated
  USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit'))
  WITH CHECK (public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit'));
CREATE POLICY cssd_fact_kho_chi_tiet_delete ON public.cssd_fact_kho_chi_tiet
  FOR DELETE TO authenticated
  USING (public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'delete'));
