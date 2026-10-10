-- RBAC-ACTIVE: vai trò đã tắt (`sys_roles.is_active = false`) không còn cấp quyền.
-- FILE ONLY — chưa apply. Prod đi qua Lead/MCP `apply_migration` (CLAUDE.md).
--
-- Trước: `v_sys_user_permissions` JOIN `sys_roles` không lọc `is_active` → vai trò bị tắt
-- vẫn xuất hiện trong `roles` và vẫn cấp `permissions` (server-permission.ts đọc view này).
-- Sau: chỉ tính vai trò đang hoạt động. Cột và thứ tự cột giữ nguyên → view phụ thuộc
-- (`v_auth_user_permissions`, RPC/policy đọc view) không phải tạo lại.
--
-- Ảnh hưởng: người dùng chỉ giữ vai trò đã tắt sẽ mất quyền ngay sau khi apply
-- (cache quyền app tối đa 5 phút). Kiểm trước khi apply:
--   SELECT r.name, count(ur.user_id)
--     FROM public.sys_roles r JOIN public.sys_user_roles ur ON ur.role_id = r.id
--    WHERE r.is_active = false GROUP BY r.name;

BEGIN;

CREATE OR REPLACE VIEW public.v_sys_user_permissions WITH (security_invoker = 'true') AS
 WITH user_perms AS (
         SELECT ur.user_id,
            jsonb_agg(DISTINCT r.name) AS roles,
            jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
           FROM public.sys_user_roles ur
             JOIN public.sys_roles r ON ur.role_id = r.id AND r.is_active = true
             LEFT JOIN public.sys_role_permissions rp ON r.id = rp.role_id
             LEFT JOIN public.sys_permissions p ON rp.permission_id = p.id
          GROUP BY ur.user_id
        )
 SELECT ns.id AS staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    (ns.extra_data ->> 'email'::text) AS email,
    ns.khoa_id,
    ns.is_active,
    k.ten_khoa AS ten_khoa_phong,
    k.ma_khoa AS ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) AS roles,
    COALESCE(up.permissions, '[]'::jsonb) AS permissions
   FROM public.mdm_nhan_su ns
     LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
     LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id;

COMMENT ON VIEW public.v_sys_user_permissions IS
  'Aggregate RBAC: nhân sự + khoa + roles + permissions. Chỉ vai trò is_active (RBAC-ACTIVE 2026-10-10).';

COMMIT;
