-- Migration: Flatten RBAC compat view chain dm_* (2-tầng) → trực tiếp sys_* (1-tầng).
-- Date: 26/05/2026 (Slice 7 follow-up).
--
-- TRƯỚC:
--   dm_roles               -> auth_dm_roles               -> sys_roles
--   dm_permissions         -> auth_dm_permissions         -> sys_permissions
--   rel_role_permissions   -> auth_rel_role_permissions   -> sys_role_permissions
--   rel_user_roles         -> auth_rel_user_roles         -> sys_user_roles
--
-- SAU (chỉ thay phần dm_*/rel_*; giữ auth_* nguyên vì còn dùng từ app cũ + đã 1-tầng):
--   dm_roles               -> sys_roles
--   dm_permissions         -> sys_permissions
--   rel_role_permissions   -> sys_role_permissions
--   rel_user_roles         -> sys_user_roles
--
-- Lý do: planner Postgres inline auto, không phải vấn đề performance,
-- nhưng chuỗi 2-tầng gây confusion khi đọc + ALTER cần cẩn trọng. Flatten cho gọn.

CREATE OR REPLACE VIEW public.dm_roles
  WITH (security_invoker = true)
AS
SELECT id, name, description, created_at, updated_at, is_active
  FROM public.sys_roles;

CREATE OR REPLACE VIEW public.dm_permissions
  WITH (security_invoker = true)
AS
SELECT id, module_name, action, description, created_at
  FROM public.sys_permissions;

CREATE OR REPLACE VIEW public.rel_role_permissions
  WITH (security_invoker = true)
AS
SELECT id, role_id, permission_id, created_at
  FROM public.sys_role_permissions;

CREATE OR REPLACE VIEW public.rel_user_roles
  WITH (security_invoker = true)
AS
SELECT id, user_id, role_id, created_at
  FROM public.sys_user_roles;

COMMENT ON VIEW public.dm_roles IS
  'Compat view 1-tầng → sys_roles. Flatten 26/05/2026.';
COMMENT ON VIEW public.dm_permissions IS
  'Compat view 1-tầng → sys_permissions. Flatten 26/05/2026.';
COMMENT ON VIEW public.rel_role_permissions IS
  'Compat view 1-tầng → sys_role_permissions. Flatten 26/05/2026.';
COMMENT ON VIEW public.rel_user_roles IS
  'Compat view 1-tầng → sys_user_roles. Flatten 26/05/2026.';
