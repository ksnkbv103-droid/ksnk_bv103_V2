-- ADM-02: nhật ký quản trị chỉ thêm (insert-only). FILE ONLY — chưa apply.
-- RLS: ADMIN đọc; không UPDATE/DELETE (kể cả service role qua trigger).
-- App ghi qua service role sau kiểm quyền (src/lib/admin-audit.ts).

BEGIN;

CREATE TABLE IF NOT EXISTS public.sys_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL,
  actor_email text NULL,
  action text NOT NULL,
  target_table text NULL,
  target_id text NULL,
  before_data jsonb NULL,
  after_data jsonb NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sys_admin_audit_created_at
  ON public.sys_admin_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_admin_audit_actor
  ON public.sys_admin_audit (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sys_admin_audit_action
  ON public.sys_admin_audit (action, created_at DESC);

ALTER TABLE public.sys_admin_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sys_admin_audit_select_admin ON public.sys_admin_audit;
CREATE POLICY sys_admin_audit_select_admin
  ON public.sys_admin_audit
  FOR SELECT
  TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

-- Không tạo policy INSERT/UPDATE/DELETE cho authenticated → PostgREST JWT bị chặn.
-- Service role bypass RLS để insert từ server action.

CREATE OR REPLACE FUNCTION public.fn_sys_admin_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'sys_admin_audit is insert-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_sys_admin_audit_no_update ON public.sys_admin_audit;
CREATE TRIGGER trg_sys_admin_audit_no_update
  BEFORE UPDATE ON public.sys_admin_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sys_admin_audit_immutable();

DROP TRIGGER IF EXISTS trg_sys_admin_audit_no_delete ON public.sys_admin_audit;
CREATE TRIGGER trg_sys_admin_audit_no_delete
  BEFORE DELETE ON public.sys_admin_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sys_admin_audit_immutable();

GRANT SELECT ON public.sys_admin_audit TO authenticated;
GRANT INSERT, SELECT ON public.sys_admin_audit TO service_role;
REVOKE UPDATE, DELETE ON public.sys_admin_audit FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.sys_admin_audit IS
  'ADM-02: nhật ký thao tác quản trị (append-only). QLCV-06/VST-05 gọi helper app sau.';

COMMIT;
