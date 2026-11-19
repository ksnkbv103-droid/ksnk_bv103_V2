-- ADR: docs/adr/20261119-vst-045-quyen-view-lanh-dao-khoa.md
-- VST-045: chuỗi migration dựng mới (db:dung, trial:prep, CI) thiếu hàng sys_permissions ('GIAM_SAT_VST','view').
-- 20261119150000 (VST-028) chèn sys_role_permissions của LANH_DAO_KHOA bằng JOIN vào hàng đó, nhưng hàng chỉ có ở
-- supabase/seeds/00-rbac.sql (chạy SAU migration) và ở prod (đã có từ trước) → trên DB dựng mới JOIN ra 0 dòng,
-- LANH_DAO_KHOA không có quyền view, pgTAP vst_rls test 5, 16, 17, 18 đỏ.
--
-- File này: (1) bảo đảm hàng quyền tồn tại; (2) chèn lại liên kết vai ↔ quyền. Không sửa 20261119150000 (đã có thể
-- được đối chiếu với prod). Idempotent: prod đã có cả hai hàng → ON CONFLICT DO NOTHING, không đổi gì.
-- Seed 00-rbac.sql chèn cùng khóa (module_name, action) với ON CONFLICT DO UPDATE description → không xung đột.
-- Không BEGIN/COMMIT: db push tự bọc transaction.

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES ('GIAM_SAT_VST', 'view', 'Xem Giám sát Vệ sinh tay')
ON CONFLICT (module_name, action) DO NOTHING;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
  JOIN public.sys_permissions p ON p.module_name = 'GIAM_SAT_VST' AND p.action = 'view'
 WHERE r.name = 'LANH_DAO_KHOA'
ON CONFLICT (role_id, permission_id) DO NOTHING;
