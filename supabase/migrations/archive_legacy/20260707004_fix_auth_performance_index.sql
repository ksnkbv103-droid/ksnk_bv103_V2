-- supabase/migrations/20260707004_fix_auth_performance_index.sql

-- 1. Thêm Index cho auth_user_id (Cực kỳ quan trọng)
-- Giúp triệt tiêu lỗi Full Table Scan mỗi khi kiểm tra Session
CREATE INDEX IF NOT EXISTS idx_mdm_nhan_su_auth_user_id ON public.mdm_nhan_su (auth_user_id);

-- 2. Cập nhật View Phân quyền (Drop và Recreate để thay đổi cấu trúc cột)
DROP VIEW IF EXISTS public.v_auth_user_permissions;

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
    ns.is_active, -- Bổ sung cột này
    k.ten_khoa as ten_khoa_phong,
    k.ma_khoa as ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) as roles,
    COALESCE(up.permissions, '[]'::jsonb) as permissions
FROM public.mdm_nhan_su ns
LEFT JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id;

GRANT SELECT ON public.v_auth_user_permissions TO authenticated, service_role;
