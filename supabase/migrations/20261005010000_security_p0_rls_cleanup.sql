-- SKIP-PROD: already applied on prod as 20261004183253_security_p0_rls_cleanup_20261005
--   (commit 10e30c9f «đã apply prod 05/10 01:32»; header name security_p0_rls_cleanup_20261005).
--   Re-apply risks CREATE POLICY name clash (not IF NOT EXISTS). Safe: exclude from apply batch;
--   đề xuất: move → supabase/migrations/archive_legacy/…SKIP-PROD.sql hoặc migration repair applied.
-- Migration: security_p0_rls_cleanup_20261005
-- Prod: cvzwslpxwgqiugzzhqej (KSNK BV103). Order from Trinh Nghia 01:20 05/10/2026 (UTC+7).
-- Scope: 5 P0 RLS holes + P1-a/b/c. NO data changes, NO index/CASCADE changes.
-- Rollback: /workspace/bv103-sec-rollback-20261005.sql (box only).

-- (apply_migration runs this file in a single transaction; no explicit BEGIN/COMMIT)
-- Fail fast instead of queueing behind app traffic (DDL here takes brief ACCESS EXCLUSIVE locks).
SET LOCAL lock_timeout = '5s';

-- ───────────────────────────────────────────────────────────────────────────
-- P0-1  gstt_dm_bang_kiem: "Admin full access" = ALL USING true / CHECK true
--       for every authenticated user -> anyone could INSERT/UPDATE/DELETE checklists.
--       Keep gstt_dm_bang_kiem_{select,insert,update,delete} (BANG_KIEM perms)
--       and "Authenticated read access" (SELECT true, read-only, out of scope).
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access" ON public.gstt_dm_bang_kiem;

-- ───────────────────────────────────────────────────────────────────────────
-- P0-2  gstt_fact_vst: "Authenticated read" (TO public, auth.role()='authenticated')
--       bypassed vst_obs_select_permission (GIAM_SAT_VST.view + active session).
--       Keep vst_obs_select_permission and "Admin full access" (ADMIN-only).
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated read" ON public.gstt_fact_vst;

-- ───────────────────────────────────────────────────────────────────────────
-- P0-3  cssd_dm_hoa_chat: dm_hoa_chat_admin_all (ALL USING true) and
--       dm_hoa_chat_select_all (SELECT true) overrode HOA_CHAT permissions.
--       cssd_dm_hoa_chat_{select,insert,update,delete} (HOA_CHAT view/create/edit/delete)
--       already exist -> no new policy needed (asserted below).
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dm_hoa_chat_admin_all  ON public.cssd_dm_hoa_chat;
DROP POLICY IF EXISTS dm_hoa_chat_select_all ON public.cssd_dm_hoa_chat;

-- ───────────────────────────────────────────────────────────────────────────
-- P0-4  cssd_dm_bo_dung_cu / cssd_dm_bo_dung_cu_chi_tiet: legacy *_auth_v1 policies.
--   a) UPDATE true/true on chi_tiet -> DROP (cssd_dm_bo_dung_cu_chi_tiet_update = DC_LE.edit stays).
--   b) SELECT true -> NOT dropped outright: role MANG_LUOI_KSNK has BAO_SU_CO.view
--      (report-incident screen picks sets) but no BO_DC/DC_LE.view. Replace with
--      "any CSSD view permission" using real module names in sys_permissions.
--      (SELECT ...) wrappers -> evaluated once per statement (initPlan).
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dm_bo_dung_cu_chi_tiet_update_auth_v1 ON public.cssd_dm_bo_dung_cu_chi_tiet;

DROP POLICY IF EXISTS dm_bo_dung_cu_select_auth_v1 ON public.cssd_dm_bo_dung_cu;
CREATE POLICY cssd_dm_bo_dung_cu_select_cssd_any_view ON public.cssd_dm_bo_dung_cu
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
       (SELECT public.fn_sys_has_permission('BO_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('DC_LE', 'view'))
    OR (SELECT public.fn_sys_has_permission('LOAI_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('THIET_BI', 'view'))
    OR (SELECT public.fn_sys_has_permission('HOA_CHAT', 'view'))
    OR (SELECT public.fn_sys_has_permission('BAO_SU_CO', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_REPORT', 'view'))
    OR (SELECT public.fn_sys_has_permission('DANH_MUC_CSSD_LOOKUP', 'view'))
  );

DROP POLICY IF EXISTS dm_bo_dung_cu_chi_tiet_select_auth_v1 ON public.cssd_dm_bo_dung_cu_chi_tiet;
CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_select_cssd_any_view ON public.cssd_dm_bo_dung_cu_chi_tiet
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
       (SELECT public.fn_sys_has_permission('BO_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('DC_LE', 'view'))
    OR (SELECT public.fn_sys_has_permission('LOAI_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('THIET_BI', 'view'))
    OR (SELECT public.fn_sys_has_permission('HOA_CHAT', 'view'))
    OR (SELECT public.fn_sys_has_permission('BAO_SU_CO', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_REPORT', 'view'))
    OR (SELECT public.fn_sys_has_permission('DANH_MUC_CSSD_LOOKUP', 'view'))
  );

-- ───────────────────────────────────────────────────────────────────────────
-- P0-5  sys_module_locks: sys_module_locks_all (ALL true/true) let any user lock/unlock
--       VST/GSC data entry. SELECT true stays via existing sys_module_locks_select;
--       writes -> admin only.
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS sys_module_locks_all ON public.sys_module_locks;
CREATE POLICY sys_module_locks_insert_admin ON public.sys_module_locks
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_module_locks_update_admin ON public.sys_module_locks
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_module_locks_delete_admin ON public.sys_module_locks
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

-- ───────────────────────────────────────────────────────────────────────────
-- P1-a  Cron "nightly-sync-dashboard-pre-aggregates" (jobid 1 at snapshot) fails nightly:
--       its target summary tables no longer exist as tables. Unschedule by name,
--       then drop the function (no trigger / pg_depend / other caller found).
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'nightly-sync-dashboard-pre-aggregates';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;
DROP FUNCTION public.fn_sync_dashboard_pre_aggregates();

-- ───────────────────────────────────────────────────────────────────────────
-- P1-b  rpc_vst_compare_matrices_impl: SECURITY DEFINER, no permission check, was
--       EXECUTE-able by authenticated. Wrapper rpc_vst_compare_matrices (SECURITY DEFINER,
--       owner postgres) checks fn_require_gstt_analytics_access and still calls impl.
-- ───────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.rpc_vst_compare_matrices_impl(date, date, uuid[], uuid[], uuid[], uuid[], text[])
  FROM PUBLIC, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- P1-c  Dead functions referencing dropped objects (mv_gsc_session_daily,
--       gstt_fact_rca_ticket). No pg_depend, trigger, cron or FE caller.
-- ───────────────────────────────────────────────────────────────────────────
DROP FUNCTION public.fn_refresh_mv_gsc_session_daily();
DROP FUNCTION public.fn_gstt_rca_gen_ma_ticket(timestamp with time zone);

-- ───────────────────────────────────────────────────────────────────────────
-- Post-assertions (abort whole migration if any fails)
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='cssd_dm_hoa_chat'
        AND policyname IN ('cssd_dm_hoa_chat_select','cssd_dm_hoa_chat_insert','cssd_dm_hoa_chat_update','cssd_dm_hoa_chat_delete')
        AND (coalesce(qual,'') || coalesce(with_check,'')) LIKE '%HOA_CHAT%') <> 4 THEN
    RAISE EXCEPTION 'P0-3 assert: thiếu policy HOA_CHAT cho cssd_dm_hoa_chat';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename IN ('gstt_dm_bang_kiem','gstt_fact_vst','cssd_dm_hoa_chat','cssd_dm_bo_dung_cu','cssd_dm_bo_dung_cu_chi_tiet','sys_module_locks')
        AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
        AND (coalesce(qual,'') = 'true' OR coalesce(with_check,'') = 'true')) THEN
    RAISE EXCEPTION 'P0 assert: vẫn còn policy ghi USING/CHECK true';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sys_module_locks'
        AND policyname='sys_module_locks_select' AND cmd='SELECT' AND qual='true') THEN
    RAISE EXCEPTION 'P0-5 assert: mất sys_module_locks_select';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='nightly-sync-dashboard-pre-aggregates') THEN
    RAISE EXCEPTION 'P1-a assert: cron job vẫn còn';
  END IF;
  IF has_function_privilege('authenticated','public.rpc_vst_compare_matrices_impl(date,date,uuid[],uuid[],uuid[],uuid[],text[])','EXECUTE')
     OR has_function_privilege('anon','public.rpc_vst_compare_matrices_impl(date,date,uuid[],uuid[],uuid[],uuid[],text[])','EXECUTE') THEN
    RAISE EXCEPTION 'P1-b assert: impl vẫn EXECUTE được bởi anon/authenticated';
  END IF;
  IF NOT has_function_privilege('authenticated','public.rpc_vst_compare_matrices(date,date,uuid[],uuid[],uuid[],uuid[],text[])','EXECUTE') THEN
    RAISE EXCEPTION 'P1-b assert: wrapper mất EXECUTE cho authenticated';
  END IF;
END $$;

