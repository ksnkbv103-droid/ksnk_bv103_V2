-- Applied remotely to ksnk-bv103-prod (2026-09-07) via Supabase MCP apply_migration.
-- Phiếu xin cấp TK / xin admin đặt lại MK (sys_account_access_request).
-- App prefers this table when present; falls back to mdm_nhan_su.extra_data.account_request.

CREATE TABLE IF NOT EXISTS public.sys_account_access_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('REQUEST', 'RESET')),
  status text NOT NULL DEFAULT 'CHO_DUYET' CHECK (status IN ('CHO_DUYET', 'DUYET', 'TU_CHOI')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  staff_id uuid NULL REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_by text NULL,
  decided_at timestamptz NULL,
  reject_reason text NULL
);

CREATE INDEX IF NOT EXISTS idx_sys_account_access_request_status_created
  ON public.sys_account_access_request (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_account_access_request_email_created
  ON public.sys_account_access_request (lower(email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sys_account_access_request_staff_status
  ON public.sys_account_access_request (staff_id, status)
  WHERE staff_id IS NOT NULL;

COMMENT ON TABLE public.sys_account_access_request IS
  'Account access tickets: REQUEST (provision) | RESET (admin forgot). App dual-writes soft extra_data until cutover.';

ALTER TABLE public.sys_account_access_request ENABLE ROW LEVEL SECURITY;

-- Service role / admin client bypasses RLS; no anon policies (public submits via server actions + service key).
