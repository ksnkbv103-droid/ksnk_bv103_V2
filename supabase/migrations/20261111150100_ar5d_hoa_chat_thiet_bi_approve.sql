-- AR-5d (PO 2026-11-10): quyền approve cho hóa chất / thiết bị CSSD.
--  - Thay đổi nhạy cảm (thêm/ngừng, nồng độ, định mức) chỉ người có approve được ghi trực tiếp.
--  - Chưa có hàng chờ mới: tổ CSSD đổi tên/ghi chú/vị trí trực tiếp; việc nhạy cảm nhờ chủ nhiệm khoa.
--  - KHÔNG đổi quyền sẵn có của vai trò nào; KHÔNG gán vai trò cho tài khoản; KHÔNG đụng RLS.
-- Chỉ thêm dữ liệu, chạy lại an toàn. Không BEGIN/COMMIT.

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES
  ('HOA_CHAT',  'approve', 'Duyệt thay đổi nhạy cảm Danh mục Hóa chất'),
  ('THIET_BI',  'approve', 'Duyệt thay đổi nhạy cảm Danh mục Thiết bị')
ON CONFLICT (module_name, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE p.module_name IN ('HOA_CHAT', 'THIET_BI')
   AND (
        (r.name = 'ADMIN' AND p.action = 'approve')
     OR (r.name = 'CHU_NHIEM_KHOA' AND p.action IN ('approve', 'view'))
   )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Rollback (chưa dùng): DELETE FROM public.sys_permissions WHERE action='approve' AND module_name IN ('HOA_CHAT','THIET_BI');
