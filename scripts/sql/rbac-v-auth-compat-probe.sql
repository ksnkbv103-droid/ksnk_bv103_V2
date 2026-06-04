-- Probe: v_auth_user_permissions vs v_sys_user_permissions (chạy trên DB đang lỗi)
SELECT jsonb_build_object(
  'v_auth_exists', EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'v_auth_user_permissions' AND c.relkind = 'v'
  ),
  'v_sys_exists', EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'v_sys_user_permissions' AND c.relkind = 'v'
  ),
  'functions_still_using_v_auth', (
    SELECT coalesce(jsonb_agg(p.proname ORDER BY p.proname), '[]'::jsonb)
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ~ 'v_auth_user_permissions'
  ),
  'fn_sys_has_permission_snippet', (
    SELECT substring(pg_get_functiondef(oid), 1, 400)
    FROM pg_proc
    WHERE proname = 'fn_sys_has_permission'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LIMIT 1
  )
);
