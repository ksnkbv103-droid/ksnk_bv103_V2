-- Đảm bảo vai trò Khách luôn tồn tại (active) + quyền xem Thống kê VST/GSC.
-- Idempotent: an toàn trên môi trường đã có KHACH hoặc thiếu sau migrate taxonomy.

BEGIN;

INSERT INTO public.sys_roles (name, description, is_active)
VALUES (
  'KHACH_THONG_KE_GSTT',
  'Khách — chỉ xem Thống kê VST và GSC (tài khoản chung)',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
JOIN public.sys_permissions p ON true
WHERE r.name = 'KHACH_THONG_KE_GSTT'
  AND p.module_name IN ('GIAM_SAT_VST', 'GIAM_SAT_CHUNG')
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
