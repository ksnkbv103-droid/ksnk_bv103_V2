-- Probe trước khi apply 20260526000001-000005.
-- Trả về kết quả gộp dạng JSON 1 dòng để pipeline đọc dễ.
SELECT jsonb_build_object(
  'audit_objects', (
    SELECT jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND relname IN ('sys_audit_log','sys_fact_audit_log','fact_bv103_audit_log')
  ),
  'rbac_objects', (
    SELECT jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind) ORDER BY relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND relname IN (
        'sys_roles','sys_permissions','sys_role_permissions','sys_user_roles',
        'auth_dm_roles','auth_dm_permissions','auth_rel_role_permissions','auth_rel_user_roles',
        'dm_roles','dm_permissions','rel_role_permissions','rel_user_roles'
      )
  ),
  'admin_core', (
    SELECT jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind) ORDER BY relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND relname IN (
        'sys_lookup_value','sys_mdm_registry','sys_mdm_suggestion',
        'mdm_nhan_su','mdm_dm_khoa_phong','mdm_dm_khoi_khoa',
        'gstt_dm_bang_kiem','gstt_dm_tieu_chi_bang_kiem','dm_bang_kiem','dm_tieu_chi_bang_kiem'
      )
  ),
  'v_auth_user_permissions', (
    SELECT jsonb_agg(jsonb_build_object('name', relname, 'kind', relkind))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND relname='v_auth_user_permissions'
  ),
  'has_pg_cron', EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron')
) AS probe;
