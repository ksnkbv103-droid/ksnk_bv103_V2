-- Repair: v_auth_user_permissions dropped at 20260530100000 while some RPC/policy
-- on the instance still reference it → báo cáo tổng hợp / filter load fails.
-- SSOT remains v_sys_user_permissions; this alias is compat-only.

BEGIN;

CREATE OR REPLACE VIEW public.v_auth_user_permissions WITH (security_invoker = true) AS
SELECT
  staff_id,
  auth_user_id,
  ho_ten,
  ma_nv,
  email,
  khoa_id,
  is_active,
  ten_khoa_phong,
  ma_khoa_phong,
  roles,
  permissions
FROM public.v_sys_user_permissions;

GRANT SELECT ON public.v_auth_user_permissions TO anon, authenticated, service_role;

COMMENT ON VIEW public.v_auth_user_permissions IS
  'Compat alias → v_sys_user_permissions. Giữ tạm cho RPC/DB object chưa rewrite; app đọc v_sys.';

-- Rewrite any remaining function bodies still pointing at the old view name.
DO $do$
DECLARE
  func record;
  olddef text;
  newdef text;
BEGIN
  FOR func IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ~ 'v_auth_user_permissions'
  LOOP
    olddef := pg_get_functiondef(func.oid);
    newdef := replace(olddef, 'public.v_auth_user_permissions', 'public.v_sys_user_permissions');
    IF newdef IS DISTINCT FROM olddef THEN
      BEGIN
        EXECUTE newdef;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'skip function rewrite %: %', func.oid::text, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;
