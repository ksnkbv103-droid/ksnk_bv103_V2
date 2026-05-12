-- 20260507006_cleanup_orphan_permissions.sql
-- Làm sạch các quyền mồ côi (Legacy) không còn trong registry

-- 1. Xóa các quyền không thuộc danh sách Module chuẩn hiện tại
-- Danh sách module chuẩn (theo src/lib/permission-registry.ts mới nhất):
-- DASHBOARD, DANH_MUC, NHAN_SU, BANG_KIEM, CONG_VIEC, LOAI_DC, BO_DC, DC_LE, THIET_BI, HOA_CHAT, KHOA_PHONG, BANG_KIEM_DETAIL, CSSD_REPORT, CSSD_KHO_DUNGCU, CSSD_WORKFLOW, CSSD_ME_TIET_KHUAN, KSNK_KHO_HOACHAT, GIAM_SAT_VST, GIAM_SAT_CHUNG, GIAM_SAT_NKBV, PHAN_QUYEN, BAO_SU_CO

DELETE FROM "public"."dm_permissions"
WHERE "module_name" NOT IN (
    'DASHBOARD', 'DANH_MUC', 'NHAN_SU', 'BANG_KIEM', 'CONG_VIEC', 
    'LOAI_DC', 'BO_DC', 'DC_LE', 'THIET_BI', 'HOA_CHAT', 
    'KHOA_PHONG', 'BANG_KIEM_DETAIL', 'CSSD_REPORT', 'CSSD_KHO_DUNGCU', 
    'CSSD_WORKFLOW', 'CSSD_ME_TIET_KHUAN', 'KSNK_KHO_HOACHAT', 
    'GIAM_SAT_VST', 'GIAM_SAT_CHUNG', 'GIAM_SAT_NKBV', 'PHAN_QUYEN', 'BAO_SU_CO'
);

-- 2. Đảm bảo tính nhất quán (Xóa các mapping trỏ tới quyền vừa bị xóa)
-- CASCADE đã tự xử lý nếu FK được thiết lập đúng, nhưng ta chạy lệnh này cho chắc chắn
DELETE FROM "public"."rel_role_permissions"
WHERE "permission_id" NOT IN (SELECT "id" FROM "public"."dm_permissions");
