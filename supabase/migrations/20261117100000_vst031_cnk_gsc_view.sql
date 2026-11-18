-- VST-031 (sổ lỗi): CHU_NHIEM_KHOA chưa có quyền GIAM_SAT_CHUNG:view nên không mở được trang GSC,
-- dù đặc tả M02 cho TK_KSNK «X E» và CHU_NHIEM_KHOA ≡ TK_KSNK. RLS + app (VST-023, 20261114170000;
-- gsc-read-scope.ts) đã cho CNK đọc toàn viện GSC nhưng chỉ có tác dụng khi vai có quyền view.
--  - CHỈ cấp view (đọc). KHÔNG cấp create/edit/delete/import GSC; sửa muộn («E») là lát riêng.
--  - KHÔNG gán vai trò cho tài khoản nào ở đây: gán người thật là cổng PO (màn Phân quyền).
--  - KHÔNG đụng fn_sys_is_admin / RLS.
-- Chỉ thêm dữ liệu, chạy lại an toàn (ON CONFLICT). Không BEGIN/COMMIT: db push tự bọc transaction.

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
 CROSS JOIN public.sys_permissions p
 WHERE r.name = 'CHU_NHIEM_KHOA'
   AND p.module_name = 'GIAM_SAT_CHUNG'
   AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Kiểm sau apply:
--   SELECT r.name, p.module_name, p.action FROM public.sys_role_permissions rp
--     JOIN public.sys_roles r ON r.id = rp.role_id JOIN public.sys_permissions p ON p.id = rp.permission_id
--    WHERE r.name = 'CHU_NHIEM_KHOA' ORDER BY 2, 3;
--   -- kỳ vọng: thêm đúng 1 dòng GIAM_SAT_CHUNG view; local sau apply tổng 13 dòng (12 dòng cũ:
--   -- GIAM_SAT_VST approve/view + LOAI_DC/BO_DC/DC_LE/HOA_CHAT/THIET_BI approve/view).
-- Rollback (chỉ khi chưa ai dựa vào; kiểm trước: nếu admin đã cấp tay cùng quyền qua màn Phân quyền thì lệnh này xóa luôn):
--   DELETE FROM public.sys_role_permissions WHERE role_id = (SELECT id FROM public.sys_roles WHERE name = 'CHU_NHIEM_KHOA')
--      AND permission_id = (SELECT id FROM public.sys_permissions WHERE module_name = 'GIAM_SAT_CHUNG' AND action = 'view');
