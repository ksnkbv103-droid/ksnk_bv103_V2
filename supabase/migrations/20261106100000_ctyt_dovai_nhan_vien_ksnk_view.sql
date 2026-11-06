-- PO 2026-11-06: NHAN_VIEN_KSNK cần xem lại số đã nhập (RLS SELECT + RPC thống kê yêu cầu 'view').
-- Bổ sung view cho HAU_CAN_MOI_TRUONG; vẫn không có edit/delete. Hoàn tác: DELETE dòng tương ứng ở sys_role_permissions.
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'NHAN_VIEN_KSNK'
  AND p.module_name = 'HAU_CAN_MOI_TRUONG'
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;
