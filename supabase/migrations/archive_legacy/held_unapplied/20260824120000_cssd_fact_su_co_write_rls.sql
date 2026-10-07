-- CSSD sự cố: đọc cho người báo/báo cáo; ghi khi có BAO_SU_CO create.
-- App vẫn ghi qua admin client; policy chặn user client không quyền.

DROP POLICY IF EXISTS cssd_fact_su_co_select ON public.cssd_fact_su_co;
CREATE POLICY cssd_fact_su_co_select ON public.cssd_fact_su_co
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_has_permission('CSSD_WORKFLOW', 'view')
    OR public.fn_sys_has_permission('BAO_SU_CO', 'view')
    OR public.fn_sys_has_permission('BAO_SU_CO', 'create')
    OR public.fn_sys_has_permission('CSSD_REPORT', 'view')
  );

DROP POLICY IF EXISTS cssd_fact_su_co_insert ON public.cssd_fact_su_co;
CREATE POLICY cssd_fact_su_co_insert ON public.cssd_fact_su_co
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_has_permission('BAO_SU_CO', 'create'));
