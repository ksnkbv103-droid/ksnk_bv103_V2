-- Migration: Restructure audit log and RBAC tables with sys_ prefix, configure strict RLS and SQL Views.
-- Date: 25/05/2026
-- NOTE: Uses exact primary key names from Supabase Schema to prevent constraint error.

-- ----------------------------------------------------
-- 1. Rename ALL physical tables (Crucial for dependency resolution)
-- ----------------------------------------------------

-- Rename fact_bv103_audit_log -> sys_audit_log
ALTER TABLE IF EXISTS public.fact_bv103_audit_log RENAME TO sys_audit_log;
ALTER TABLE IF EXISTS public.sys_audit_log RENAME CONSTRAINT fact_bv103_audit_log_pkey TO sys_audit_log_pkey;
ALTER INDEX IF EXISTS public.idx_fact_bv103_audit_log_table_record RENAME TO idx_sys_audit_log_table_record;

-- Rename dm_permissions -> sys_permissions
ALTER TABLE IF EXISTS public.dm_permissions RENAME TO sys_permissions;
ALTER TABLE IF EXISTS public.sys_permissions RENAME CONSTRAINT permissions_pkey TO sys_permissions_pkey;
ALTER TABLE IF EXISTS public.sys_permissions RENAME CONSTRAINT uq_permissions_module_action TO uq_sys_permissions_module_action;

-- Rename dm_roles -> sys_roles
ALTER TABLE IF EXISTS public.dm_roles RENAME TO sys_roles;
ALTER TABLE IF EXISTS public.sys_roles RENAME CONSTRAINT roles_pkey TO sys_roles_pkey;
ALTER TABLE IF EXISTS public.sys_roles RENAME CONSTRAINT roles_name_key TO sys_roles_name_key;

-- Rename rel_role_permissions -> sys_role_permissions
ALTER TABLE IF EXISTS public.rel_role_permissions RENAME TO sys_role_permissions;
ALTER TABLE IF EXISTS public.sys_role_permissions RENAME CONSTRAINT role_permissions_pkey TO sys_role_permissions_pkey;
ALTER TABLE IF EXISTS public.sys_role_permissions RENAME CONSTRAINT uq_role_permissions TO uq_sys_role_permissions;

-- Rename rel_user_roles -> sys_user_roles
ALTER TABLE IF EXISTS public.rel_user_roles RENAME TO sys_user_roles;
ALTER TABLE IF EXISTS public.sys_user_roles RENAME CONSTRAINT user_roles_pkey TO sys_user_roles_pkey;
ALTER TABLE IF EXISTS public.sys_user_roles RENAME CONSTRAINT uq_user_roles TO uq_sys_user_roles;

-- ----------------------------------------------------
-- 2. Configure Triggers & Row Level Security (RLS)
-- ----------------------------------------------------

-- Recreate trigger function to point to sys_audit_log
CREATE OR REPLACE FUNCTION public.fn_bv103_audit_row() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_id := coalesce(
    to_jsonb(NEW)->>'id',
    to_jsonb(OLD)->>'id'
  );
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, old_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new);
    RETURN NEW;
  ELSE
    v_new := to_jsonb(NEW);
    INSERT INTO public.sys_audit_log (table_name, record_id, action, new_data)
    VALUES (TG_TABLE_NAME, v_id, TG_OP, v_new);
    RETURN NEW;
  END IF;
END;
$$;

-- Configure row-level security for sys_audit_log
ALTER TABLE public.sys_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fact_bv103_audit_log_select_authenticated ON public.sys_audit_log;
DROP POLICY IF EXISTS sys_audit_log_select_policy ON public.sys_audit_log;

-- Now public.sys_user_roles and public.sys_roles exist, so policy compiles perfectly
CREATE POLICY sys_audit_log_select_policy ON public.sys_audit_log
FOR SELECT TO authenticated
USING (
  -- 1. Is Admin
  (EXISTS (
     SELECT 1 FROM public.sys_user_roles ur
     JOIN public.sys_roles r ON ur.role_id = r.id
     WHERE ur.user_id = auth.uid() AND upper(trim(r.name)) = 'ADMIN' AND r.is_active = true
  ))
  OR
  -- 2. Has view permission for PHAN_QUYEN
  (EXISTS (
     SELECT 1 FROM public.sys_user_roles ur
     JOIN public.sys_roles r ON ur.role_id = r.id
     JOIN public.sys_role_permissions rp ON r.id = rp.role_id
     JOIN public.sys_permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = auth.uid() AND p.module_name = 'PHAN_QUYEN' AND p.action = 'view' AND r.is_active = true
  ))
  OR
  -- 3. Is the author of the log
  (changed_by = auth.uid())
  OR
  -- 4. Log without changer
  (changed_by IS NULL)
);

-- ----------------------------------------------------
-- 3. Create Backward Compatibility SQL Views
-- ----------------------------------------------------

CREATE OR REPLACE VIEW public.fact_bv103_audit_log WITH (security_invoker='true') AS
SELECT * FROM public.sys_audit_log;

CREATE OR REPLACE VIEW public.dm_permissions WITH (security_invoker='true') AS
SELECT * FROM public.sys_permissions;

CREATE OR REPLACE VIEW public.dm_roles WITH (security_invoker='true') AS
SELECT * FROM public.sys_roles;

CREATE OR REPLACE VIEW public.rel_role_permissions WITH (security_invoker='true') AS
SELECT * FROM public.sys_role_permissions;

CREATE OR REPLACE VIEW public.rel_user_roles WITH (security_invoker='true') AS
SELECT * FROM public.sys_user_roles;
