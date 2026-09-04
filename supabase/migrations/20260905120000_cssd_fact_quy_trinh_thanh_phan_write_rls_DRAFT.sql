-- DRAFT / LOCAL FIRST — do NOT apply to linked / production.
-- ADR follow-up: docs/core/adr-cssd-fact-write-rls.md (thanh_phan).
-- Peer pattern: 20260904140000 quy_trinh/lo + 20260824120000 su_co write.
--
-- NOTE lean model: cssd_fact_quy_trinh_thanh_phan DROP'd in
-- 20260622120000_cssd_quy_trinh_hub_consolidation.sql → BOM = metadata.bom_lines[].
-- IF EXISTS → no-op on current pilot; residual/legacy envs get write RLS defense-in-depth.
-- App write remains admin-client.

DO $draft$
BEGIN
  IF to_regclass('public.cssd_fact_quy_trinh_thanh_phan') IS NULL THEN
    RAISE NOTICE 'cssd_fact_quy_trinh_thanh_phan absent (lean hub) — skip write RLS DRAFT';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS cssd_fact_quy_trinh_thanh_phan_select ON public.cssd_fact_quy_trinh_thanh_phan';
  EXECUTE $p$
    CREATE POLICY cssd_fact_quy_trinh_thanh_phan_select ON public.cssd_fact_quy_trinh_thanh_phan
      FOR SELECT TO authenticated
      USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'))
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS cssd_fact_quy_trinh_thanh_phan_insert ON public.cssd_fact_quy_trinh_thanh_phan';
  EXECUTE $p$
    CREATE POLICY cssd_fact_quy_trinh_thanh_phan_insert ON public.cssd_fact_quy_trinh_thanh_phan
      FOR INSERT TO authenticated
      WITH CHECK (
        public.fn_sys_has_permission('CSSD_WORKFLOW', 'create')
        OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS cssd_fact_quy_trinh_thanh_phan_update ON public.cssd_fact_quy_trinh_thanh_phan';
  EXECUTE $p$
    CREATE POLICY cssd_fact_quy_trinh_thanh_phan_update ON public.cssd_fact_quy_trinh_thanh_phan
      FOR UPDATE TO authenticated
      USING (public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit'))
      WITH CHECK (public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit'))
  $p$;

  -- DELETE: không mở (mirror quy_trinh/lo DRAFT)
  RAISE NOTICE 'cssd_fact_quy_trinh_thanh_phan write RLS DRAFT applied (legacy table present)';
END
$draft$;
