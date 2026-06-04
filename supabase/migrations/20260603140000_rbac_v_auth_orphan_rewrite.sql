-- Idempotent follow-up: some instances still hit v_auth_user_permissions after 20260602180000
-- (function rewrite skipped or migration 20260603120000 not applied). SSOT = v_sys_user_permissions.

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
  'Compat alias → v_sys_user_permissions. App đọc v_sys; giữ cho RPC/policy cũ trên DB.';

CREATE OR REPLACE FUNCTION public.fn_sys_has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_sys_user_permissions
     WHERE auth_user_id = auth.uid()
       AND permissions @> jsonb_build_array(
             jsonb_build_object('module', p_module, 'action', p_action)
           )
  )
  OR public.fn_sys_is_admin();
$$;

CREATE OR REPLACE FUNCTION public.fn_sys_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_sys_user_permissions
     WHERE auth_user_id = auth.uid()
       AND roles ? 'ADMIN'
  );
$$;

DO $do$
DECLARE
  func record;
  olddef text;
  newdef text;
BEGIN
  FOR func IN
    SELECT p.oid, p.proname
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
        RAISE NOTICE 'rewrote function %', func.proname;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'skip function %: %', func.proname, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;
