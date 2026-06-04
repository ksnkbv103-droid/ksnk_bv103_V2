-- BV103 — Precheck DB pilot: Quản trị, Giám sát (GSC/VST), QLCV (+ RPC dashboard đọc).
-- Chạy SAU migrate: `npm run mdm:migrate` hoặc `mdm:migrate:local`.
--   npm run trial:db:precheck:local
--   npm run trial:db:precheck
-- Cột *_ok: true khi đối tượng tồn tại (ưu tiên tên module SSOT; compat dm_*/fact_* nếu còn).

SELECT
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') AS unaccent_ext_ok,

  (
    to_regclass('public.mdm_dm_khoa_phong') IS NOT NULL
    OR to_regclass('public.dm_khoa_phong') IS NOT NULL
  ) AS khoa_phong_ok,
  to_regclass('public.mdm_nhan_su') IS NOT NULL AS mdm_nhan_su_ok,
  (
    to_regclass('public.gstt_dm_bang_kiem') IS NOT NULL
    OR to_regclass('public.dm_bang_kiem') IS NOT NULL
  ) AS bang_kiem_ok,
  (
    to_regclass('public.gstt_dm_tieu_chi_bang_kiem') IS NOT NULL
    OR to_regclass('public.dm_tieu_chi_bang_kiem') IS NOT NULL
  ) AS tieu_chi_bang_kiem_ok,

  (
    to_regclass('public.gstt_fact_chung_sessions') IS NOT NULL
    OR to_regclass('public.fact_giam_sat_chung_sessions') IS NOT NULL
  ) AS fact_gsc_sessions_ok,
  (
    to_regclass('public.gstt_fact_chung_sessions') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'gstt_fact_chung_sessions'
        AND c.column_name = 'results_jsonb'
    )
  ) AS fact_gsc_results_ok,
  (
    to_regclass('public.gstt_fact_vst_sessions') IS NOT NULL
    OR to_regclass('public.fact_giam_sat_vst_sessions') IS NOT NULL
  ) AS fact_vst_sessions_ok,
  (
    to_regclass('public.gstt_fact_vst') IS NOT NULL
    OR to_regclass('public.fact_giam_sat_vst') IS NOT NULL
  ) AS fact_vst_rows_ok,

  to_regclass('public.qlcv_fact_cong_viec') IS NOT NULL AS qlcv_fact_cong_viec_ok,
  to_regclass('public.qlcv_fact_cong_viec_dinh_ky') IS NOT NULL AS qlcv_fact_dinh_ky_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_fact_cong_viec_spawn_dinh_ky_hom_nay',
        'fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay'
      )
  ) AS qlcv_spawn_rpc_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_qlcv_update_checklist'
  ) AS qlcv_checklist_rpc_ok,

  to_regclass('public.v_sys_user_permissions') IS NOT NULL AS v_sys_user_permissions_ok,

  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_dashboard_vst_strategic_analytics'
  ) AS rpc_vst_strategic_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_dashboard_gsc_strategic_analytics'
  ) AS rpc_gsc_strategic_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_compliance_dashboard_v4'
  ) AS rpc_compliance_v4_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_dashboard_ksnk_staff_supervision_stats'
  ) AS rpc_dashboard_ksnk_staff_stats_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_registry_options'
  ) AS rpc_registry_options_ok;
