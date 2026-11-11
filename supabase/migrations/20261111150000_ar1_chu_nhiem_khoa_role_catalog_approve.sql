-- AR-1 (PO 2026-11-10): tách «chủ nhiệm khoa duyệt chuyên môn» khỏi vai trò ADMIN.
--  - Vai trò mới CHU_NHIEM_KHOA (giữ ADMIN song song; không ai mất quyền).
--  - Quyền approve cho danh mục dụng cụ CSSD (LOAI_DC / BO_DC / DC_LE): server kiểm theo quyền,
--    không theo tên vai trò (cùng mẫu 20261028100000 CSSD_HOA_CHAT.approve).
--  - KHÔNG gán vai trò cho tài khoản nào ở đây: gán người thật là cổng PO (màn Phân quyền).
--  - KHÔNG đụng fn_sys_is_admin / RLS.
-- Chỉ thêm dữ liệu, chạy lại an toàn (ON CONFLICT). Không BEGIN/COMMIT: db push tự bọc transaction.

INSERT INTO public.sys_roles (name, description, is_active)
VALUES ('CHU_NHIEM_KHOA', 'Chủ nhiệm khoa KSNK — duyệt chuyên môn, giám sát thay đổi danh mục', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES
  ('LOAI_DC', 'approve', 'Duyệt Danh mục Loại dụng cụ'),
  ('BO_DC',   'approve', 'Duyệt Danh mục Bộ dụng cụ'),
  ('DC_LE',   'approve', 'Duyệt Danh mục Dụng cụ chi tiết')
ON CONFLICT (module_name, action) DO UPDATE SET description = EXCLUDED.description;

-- ADMIN: giữ đủ quyền (đồng nhất với sync registry «ADMIN full quyền»).
-- CHU_NHIEM_KHOA: duyệt + xem 3 danh mục dụng cụ (xem để đọc được hàng chờ duyệt).
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE p.module_name IN ('LOAI_DC', 'BO_DC', 'DC_LE')
   AND (
        (r.name = 'ADMIN' AND p.action = 'approve')
     OR (r.name = 'CHU_NHIEM_KHOA' AND p.action IN ('approve', 'view'))
   )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Kiểm sau apply:
--   SELECT r.name, p.module_name, p.action FROM public.sys_role_permissions rp
--     JOIN public.sys_roles r ON r.id = rp.role_id JOIN public.sys_permissions p ON p.id = rp.permission_id
--    WHERE r.name = 'CHU_NHIEM_KHOA' ORDER BY 2, 3;   -- kỳ vọng 6 dòng
-- Rollback (chỉ khi chưa gán cho ai):
--   DELETE FROM public.sys_roles WHERE name = 'CHU_NHIEM_KHOA';
--   DELETE FROM public.sys_permissions WHERE action = 'approve' AND module_name IN ('LOAI_DC','BO_DC','DC_LE');
