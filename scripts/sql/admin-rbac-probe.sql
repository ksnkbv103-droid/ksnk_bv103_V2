-- Probe trước Slice 7/4 follow-up:
-- 1. Chuỗi view RBAC dm_* → auth_* → sys_*
-- 2. Helper functions fn_sys_is_admin / fn_sys_has_permission có gì
-- 3. Coverage RBAC data: có ADMIN role + user nào đang có ADMIN không
SELECT jsonb_build_object(
  'rbac_view_chain', (
    SELECT jsonb_object_agg(viewname, substring(definition, 1, 200))
      FROM pg_views
     WHERE schemaname='public'
      AND viewname IN ('sys_roles','sys_permissions','sys_user_roles','sys_role_permissions',
                       'v_sys_user_permissions')
  ),
  'fn_is_admin_def', (
    SELECT pg_get_functiondef(oid) FROM pg_proc
     WHERE proname='fn_sys_is_admin' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
  ),
  'fn_has_permission_def', (
    SELECT pg_get_functiondef(oid) FROM pg_proc
     WHERE proname='fn_sys_has_permission' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
  ),
  'sys_roles_codes', (SELECT jsonb_agg(name ORDER BY name) FROM public.sys_roles),
  'sys_permissions_count', (SELECT count(*) FROM public.sys_permissions),
  'sys_user_roles_count', (SELECT count(*) FROM public.sys_user_roles),
  'sys_role_permissions_count', (SELECT count(*) FROM public.sys_role_permissions),
  'admin_role_id', (SELECT id::text FROM public.sys_roles WHERE upper(name) IN ('ADMIN','SUPER_ADMIN','SUPERADMIN') LIMIT 1),
  'admin_users_count', (
    SELECT count(*) FROM public.sys_user_roles ur
     JOIN public.sys_roles r ON r.id = ur.role_id
     WHERE upper(r.name) IN ('ADMIN','SUPER_ADMIN','SUPERADMIN')
  ),
  'sys_permissions_columns', (
    SELECT jsonb_agg(column_name ORDER BY ordinal_position)
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='sys_permissions'
  ),
  'sys_permissions_sample', (
    SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT * FROM public.sys_permissions LIMIT 6) t
  )
);
