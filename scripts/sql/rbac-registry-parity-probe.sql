-- RBAC registry ↔ DB parity (legacy SQL probe — số kỳ vọng cố định).
-- Ưu tiên: `npm run admin:rbac:parity:local` (đọc registry động từ permission-registry-data.ts).
-- Nếu parity_ok false → chạy "Đồng bộ registry" UI hoặc `npm run admin:rbac:sync:local`.

SELECT jsonb_build_object(
  'db_permission_count', (SELECT count(*)::bigint FROM public.sys_permissions),
  'db_module_count', (SELECT count(DISTINCT module_name)::bigint FROM public.sys_permissions),
  'registry_expected_permissions', 119,
  'registry_expected_modules', 29,
  'parity_ok', (SELECT count(*)::bigint FROM public.sys_permissions) >= 119,
  'role_count', (SELECT count(*)::bigint FROM public.sys_roles),
  'role_permission_links', (SELECT count(*)::bigint FROM public.sys_role_permissions),
  'user_role_links', (SELECT count(*)::bigint FROM public.sys_user_roles),
  'admin_granted', (
    SELECT count(rp.permission_id)::bigint
    FROM public.sys_roles r
    JOIN public.sys_role_permissions rp ON rp.role_id = r.id
    WHERE r.name = 'ADMIN'
  ),
  'admin_total_should_match', (SELECT count(*)::bigint FROM public.sys_permissions)
) AS rbac_parity;
