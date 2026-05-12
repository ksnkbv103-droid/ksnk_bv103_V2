-- supabase/migrations/20260707003_technical_debt_resolving_views.sql

-- 1. View Phân quyền tập trung (RBAC SSOT)
-- Giúp lấy toàn bộ Profile, Roles, Permissions trong 1 nốt nhạc
CREATE OR REPLACE VIEW public.v_auth_user_permissions AS
WITH user_perms AS (
    SELECT 
        ur.user_id,
        jsonb_agg(DISTINCT r.name) as roles,
        jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) as permissions
    FROM public.rel_user_roles ur
    JOIN public.dm_roles r ON ur.role_id = r.id
    LEFT JOIN public.rel_role_permissions rp ON r.id = rp.role_id
    LEFT JOIN public.dm_permissions p ON rp.permission_id = p.id
    GROUP BY ur.user_id
)
SELECT 
    ns.id as staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    ns.email,
    ns.khoa_id,
    k.ten_khoa as ten_khoa_phong,
    k.ma_khoa as ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) as roles,
    COALESCE(up.permissions, '[]'::jsonb) as permissions
FROM public.mdm_nhan_su ns
LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id;

-- 2. View Quản lý công việc (Work Management Full)
-- Giải quyết nợ Manual JOINs và Aliasing trong TypeScript
CREATE OR REPLACE VIEW public.v_fact_cong_viec_full AS
SELECT 
    cv.id,
    cv.ma_cong_viec as ma_cv,
    cv.ten_cong_viec as tieu_de,
    cv.mo_ta,
    cv.ma_loai_cong_viec as loai_cong_viec,
    cv.ma_trang_thai as trang_thai,
    cv.tien_do,
    cv.cong_viec_cha_id as parent_id,
    cv.khoa_thuc_hien_id,
    cv.nguoi_giao_viec_id as nguoi_giao_id,
    cv.nguoi_thuc_hien_viec_id as nguoi_thuc_hien_id,
    cv.nguoi_de_xuat_viec_id as nguoi_de_xuat_id,
    cv.to_cong_tac_id as to_id,
    cv.ngay_han_chot as han_chot,
    cv.ngay_hoan_thanh,
    cv.ket_qua_tong_hop,
    cv.is_active,
    cv.created_at,
    cv.updated_at,
    -- JOIN thông tin định danh
    ns_giao.ho_ten as ten_nguoi_giao,
    ns_thuc.ho_ten as ten_nguoi_thuc_hien,
    ns_dexuat.ho_ten as ten_nguoi_de_xuat,
    k.ten_khoa as ten_khoa_thuc_hien,
    t.ten_to as ten_to_cong_tac
FROM public.fact_cong_viec cv
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_nhan_su ns_thuc ON cv.nguoi_thuc_hien_viec_id = ns_thuc.id
LEFT JOIN public.mdm_nhan_su ns_dexuat ON cv.nguoi_de_xuat_viec_id = ns_dexuat.id
LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

GRANT SELECT ON public.v_auth_user_permissions TO authenticated, service_role;
GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
