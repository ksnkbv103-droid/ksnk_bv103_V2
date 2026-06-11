-- Probe admin / RBAC / MDM SSOT (thay probe Slice 7 cũ — 2026-06-11).
-- Chạy tay sau migrate hoặc trước slice quản trị.
SELECT jsonb_build_object(
  'audit_log_removed', NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'sys_audit_log'
  ),
  'legacy_compat_views_dropped', NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname IN (
        'dm_khoa_phong', 'dm_bang_kiem', 'fact_cong_viec',
        'fact_giam_sat_vst_sessions', 'dm_tram_cssd'
      )
  ),
  'rbac_tables', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind) ORDER BY relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND relname IN (
        'sys_roles', 'sys_permissions', 'sys_role_permissions', 'sys_user_roles',
        'v_sys_user_permissions', 'v_auth_user_permissions'
      )
  ),
  'admin_core', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind) ORDER BY relname), '[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND relname IN (
        'sys_lookup_value', 'sys_mdm_registry', 'sys_mdm_suggestion',
        'mdm_field_registry', 'mdm_nhan_su', 'mdm_dm_khoa_phong',
        'gstt_dm_bang_kiem', 'gstt_dm_tieu_chi_bang_kiem'
      )
  ),
  'functions_still_using_v_auth', (
    SELECT coalesce(jsonb_agg(p.proname ORDER BY p.proname), '[]'::jsonb)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ~ 'v_auth_user_permissions'
      AND p.proname <> 'fn_sys_has_permission'
  ),
  'has_pg_cron', EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
) AS probe;
