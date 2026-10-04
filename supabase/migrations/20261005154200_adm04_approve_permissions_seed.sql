-- ADM-04: seed quyền duyệt (implant / sự cố / NKBV). FILE ONLY — chưa apply.
-- Mặc định tạm: chỉ ADMIN (A1 chờ Nghĩa đưa tên). Idempotent.
-- Multi-role (vai trò nền + vai trò duyệt): park — RPC gán hiện 1 vai trò KSNK/TK.

BEGIN;

INSERT INTO public.sys_permissions (module_name, action, description)
VALUES
  ('CSSD_ME_TIET_KHUAN', 'nha_implant', 'Nhả mẻ implant / sau BI âm / ghi chờ BI'),
  ('BAO_SU_CO', 'confirm', 'Xác nhận phiếu sự cố (Trưởng đơn vị CSSD)'),
  ('BAO_SU_CO', 'recall', 'Ra lệnh thu hồi mẻ/bộ'),
  ('BAO_SU_CO', 'close', 'Đóng / giải phóng sự cố tiệt khuẩn'),
  ('GIAM_SAT_NKBV', 'approve', 'Duyệt xác nhận ca NKBV (≠ người ghi)')
ON CONFLICT (module_name, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'ADMIN'
  AND (
    (p.module_name = 'CSSD_ME_TIET_KHUAN' AND p.action = 'nha_implant')
    OR (p.module_name = 'BAO_SU_CO' AND p.action IN ('confirm', 'recall', 'close'))
    OR (p.module_name = 'GIAM_SAT_NKBV' AND p.action = 'approve')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Vai trò duyệt cộng thêm (park — chưa tạo role/gán multi):
-- TO_TRUONG_CSSD, DUYET_KSNK — chờ N-ADM-1/A1 tên + đổi RPC gán 1→nhiều vai trò.

COMMENT ON TABLE public.sys_permissions IS
  'ADM-04: đã seed nha_implant / BAO_SU_CO.confirm|recall|close / GIAM_SAT_NKBV.approve (ADMIN).';

COMMIT;
