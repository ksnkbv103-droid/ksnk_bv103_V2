-- QLCV L1 · mọi nhân viên KSNK được gửi đề xuất công việc (PO 2026-10-29).
-- Trước: NHAN_VIEN_KSNK chỉ có CONG_VIEC.view → nút «Đề xuất việc mới» bị ẩn.
-- Sau: thêm CONG_VIEC.create cho NHAN_VIEN_KSNK. Chỉ mở luồng createDeXuat (is_active=false, chờ duyệt);
--   tạo việc trực tiếp vẫn cần CONG_VIEC.edit, duyệt cần CONG_VIEC.approve. Ghi bảng đi qua server action (service role).

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE r.name = 'NHAN_VIEN_KSNK'
   AND p.module_name = 'CONG_VIEC' AND p.action = 'create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Hoàn tác: DELETE FROM public.sys_role_permissions rp USING public.sys_roles r, public.sys_permissions p
--   WHERE rp.role_id = r.id AND rp.permission_id = p.id
--     AND r.name = 'NHAN_VIEN_KSNK' AND p.module_name = 'CONG_VIEC' AND p.action = 'create';

-- CHƯA APPLY PROD — chờ PO (đổi quyền người dùng thật).
