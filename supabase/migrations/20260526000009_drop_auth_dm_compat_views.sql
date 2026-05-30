-- Migration: DROP 4 view compat RBAC `auth_dm_*` không còn consumer.
-- Date: 26/05/2026 (Phase A — đóng admin module).
--
-- Bối cảnh:
-- - Slice 7 follow-up (000007) đã flatten chuỗi `dm_* → auth_* → sys_*` thành `dm_* → sys_*`.
-- - App code 26/05 không còn truy cập `auth_dm_*` (grep src/: 0 hit thực).
-- - Tuy nhiên view `v_auth_user_permissions` vẫn JOIN qua chuỗi `auth_*` cũ.
-- - Helper `fn_sys_is_admin` + `fn_sys_has_permission` đọc qua `v_auth_user_permissions`
--   → cần re-point sang `sys_*` trước khi DROP, nếu không sẽ vỡ RLS toàn hệ thống.
--
-- Thứ tự đảm bảo zero-downtime:
-- 1. CREATE OR REPLACE VIEW v_auth_user_permissions (đọc trực tiếp sys_*).
-- 2. DROP 4 view auth_dm_*.

CREATE OR REPLACE VIEW public.v_auth_user_permissions
  WITH (security_invoker = true)
AS
WITH user_perms AS (
  SELECT ur.user_id,
         jsonb_agg(DISTINCT r.name) AS roles,
         jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
    FROM public.sys_user_roles ur
    JOIN public.sys_roles r ON ur.role_id = r.id
    LEFT JOIN public.sys_role_permissions rp ON r.id = rp.role_id
    LEFT JOIN public.sys_permissions p ON rp.permission_id = p.id
   GROUP BY ur.user_id
)
SELECT ns.id AS staff_id,
       ns.auth_user_id,
       ns.ho_ten,
       ns.ma_nv,
       ns.extra_data ->> 'email'::text AS email,
       ns.khoa_id,
       ns.is_active,
       k.ten_khoa AS ten_khoa_phong,
       k.ma_khoa AS ma_khoa_phong,
       COALESCE(up.roles, '[]'::jsonb) AS roles,
       COALESCE(up.permissions, '[]'::jsonb) AS permissions
  FROM public.mdm_nhan_su ns
  LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
  LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id;

COMMENT ON VIEW public.v_auth_user_permissions IS
  'Aggregate RBAC: nhân sự + khoa + roles + permissions. Re-pointed sys_* 26/05/2026.';

-- Sau khi v_auth_user_permissions đã không còn ref auth_*, drop được.
DROP VIEW IF EXISTS public.auth_dm_roles;
DROP VIEW IF EXISTS public.auth_dm_permissions;
DROP VIEW IF EXISTS public.auth_rel_role_permissions;
DROP VIEW IF EXISTS public.auth_rel_user_roles;
