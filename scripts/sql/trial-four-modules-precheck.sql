-- BV103 — Precheck DB cho pilot 4 module: Quản trị (MDM + bảng kiểm), Giám sát chung, VST, Dashboard.
-- Chạy SAU khi đã áp toàn bộ migration: `npm run mdm:migrate` hoặc `npm run mdm:migrate:local`.
--   npx supabase db query --local  --agent=no -f scripts/sql/trial-four-modules-precheck.sql -o table
--   npx supabase db query --linked --agent=no -f scripts/sql/trial-four-modules-precheck.sql -o table
-- Kết quả: một dòng; cột *_ok = t nếu đối tượng tồn tại.

SELECT
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'unaccent') AS unaccent_ext_ok,

  to_regclass('public.dm_khoa_phong') IS NOT NULL AS dm_khoa_phong_ok,
  to_regclass('public.mdm_nhan_su') IS NOT NULL AS mdm_nhan_su_ok,
  to_regclass('public.dm_bang_kiem') IS NOT NULL AS dm_bang_kiem_ok,
  to_regclass('public.dm_tieu_chi_bang_kiem') IS NOT NULL AS dm_tieu_chi_bang_kiem_ok,

  to_regclass('public.fact_giam_sat_chung_sessions') IS NOT NULL AS fact_gsc_sessions_ok,
  to_regclass('public.fact_giam_sat_chung_results') IS NOT NULL AS fact_gsc_results_ok,
  to_regclass('public.fact_giam_sat_vst_sessions') IS NOT NULL AS fact_vst_sessions_ok,
  to_regclass('public.fact_giam_sat_vst') IS NOT NULL AS fact_vst_rows_ok,

  to_regclass('public.v_auth_user_permissions') IS NOT NULL AS v_auth_user_permissions_ok,

  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_dashboard_summary_table'
  ) AS rpc_dashboard_summary_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_compliance_dashboard_multi_v1'
  ) AS rpc_compliance_multi_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_vst_dashboard_v2'
  ) AS rpc_vst_dashboard_v2_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_vst_moment_table_only'
  ) AS rpc_vst_moment_table_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rpc_get_registry_options'
  ) AS rpc_registry_options_ok;
