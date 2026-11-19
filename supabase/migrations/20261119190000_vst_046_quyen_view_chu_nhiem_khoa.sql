-- ADR: docs/adr/20261119-vst-046-quyen-view-chu-nhiem-khoa.md
-- VST-046: chuỗi migration dựng mới (db:dung, trial:prep, CI) để CHU_NHIEM_KHOA thiếu 7 liên kết quyền `view`
-- (GIAM_SAT_VST, GIAM_SAT_CHUNG, LOAI_DC, BO_DC, DC_LE, HOA_CHAT, THIET_BI), chỉ có 6 liên kết `approve`.
-- Nguyên nhân cùng lớp VST-045: các migration 20261111150000 (ar1), 20261111150100 (ar5d), 20261114110000, 20261117100000
-- nối CHU_NHIEM_KHOA bằng JOIN vào hàng sys_permissions `view`, nhưng không migration nào chèn các hàng `view` đó
-- (chúng chỉ có từ supabase/seeds/00-rbac.sql chạy SAU migration, và từ prod) → JOIN ra 0 dòng, không báo lỗi.
-- Seed không nối quyền cho CHU_NHIEM_KHOA, nên khoảng trống không tự lành.
--
-- File này: (1) bảo đảm 7 hàng `view` tồn tại (GIAM_SAT_VST:view đã do 20261119180000 chèn, DO NOTHING); (2) nối lại 7 liên kết.
-- CHỈ cấp `view`: không create/edit/delete/import, không đổi `approve`, không gán vai cho tài khoản, không đụng RLS/GRANT/RPC.
-- Không sửa 4 file migration cũ (đã có thể được đối chiếu với prod). Idempotent: ON CONFLICT DO NOTHING nên hàng đã có
-- (prod, seed) không đổi; mô tả khớp seed 00-rbac.sql.
-- Không BEGIN/COMMIT: db push tự bọc transaction.
-- Trước khi áp prod: đối chiếu CHU_NHIEM_KHOA trên prod (kỳ vọng 13 liên kết = 6 approve + 7 view); nếu prod thiếu liên kết
-- `view` nào thì migration này THÊM quyền xem đó cho vai (đúng ý các migration gốc), không bớt quyền nào.

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES
  ('GIAM_SAT_VST',   'view', 'Xem Giám sát Vệ sinh tay'),
  ('GIAM_SAT_CHUNG', 'view', 'Xem Giám sát Bảng kiểm chung'),
  ('LOAI_DC',        'view', 'Xem Danh mục Loại dụng cụ'),
  ('BO_DC',          'view', 'Xem Danh mục Bộ dụng cụ'),
  ('DC_LE',          'view', 'Xem Danh mục Dụng cụ chi tiết'),
  ('HOA_CHAT',       'view', 'Xem Danh mục Hóa chất'),
  ('THIET_BI',       'view', 'Xem Danh mục Thiết bị')
ON CONFLICT (module_name, action) DO NOTHING;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
  JOIN public.sys_permissions p
    ON p.action = 'view'
   AND p.module_name IN ('GIAM_SAT_VST', 'GIAM_SAT_CHUNG', 'LOAI_DC', 'BO_DC', 'DC_LE', 'HOA_CHAT', 'THIET_BI')
 WHERE r.name = 'CHU_NHIEM_KHOA'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Kiểm sau apply (kỳ vọng 13 dòng: 6 approve + 7 view):
--   SELECT p.module_name, p.action FROM public.sys_role_permissions rp
--     JOIN public.sys_roles r ON r.id = rp.role_id JOIN public.sys_permissions p ON p.id = rp.permission_id
--    WHERE r.name = 'CHU_NHIEM_KHOA' ORDER BY 1, 2;
-- Rollback (DB dựng mới/local; không xóa hàng sys_permissions vì seed và prod dùng chung):
--   DELETE FROM public.sys_role_permissions
--    WHERE role_id = (SELECT id FROM public.sys_roles WHERE name = 'CHU_NHIEM_KHOA')
--      AND permission_id IN (SELECT id FROM public.sys_permissions WHERE action = 'view'
--          AND module_name IN ('GIAM_SAT_VST','GIAM_SAT_CHUNG','LOAI_DC','BO_DC','DC_LE','HOA_CHAT','THIET_BI'));
-- Trên prod chỉ hoàn tác khi chưa ai dựa vào; nếu admin đã cấp tay cùng quyền qua màn Phân quyền thì lệnh này xóa luôn.
