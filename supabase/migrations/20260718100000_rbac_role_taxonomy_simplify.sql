-- Gom taxonomy RBAC: Tổ trưởng + Thành viên → MANG_LUOI_KSNK;
-- soft-deprecate BAN_QLCL / KHOA_TRANG_BI / TO_TRUONG / THANH_VIEN;
-- RPC gán vai trò chỉ còn Hội đồng · NV KSNK · Mạng lưới · Khách.

BEGIN;

-- 1) Đảm bảo vai trò Mạng lưới tồn tại (active)
INSERT INTO public.sys_roles (name, description, is_active)
VALUES (
  'MANG_LUOI_KSNK',
  'Mạng lưới KSNK — nhập liệu giám sát theo khoa (gồm tổ trưởng và thành viên)',
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

-- 2) Remap user: TO_TRUONG / THANH_VIEN → MANG_LUOI (idempotent, tránh trùng)
WITH network AS (
  SELECT id AS network_id FROM public.sys_roles WHERE name = 'MANG_LUOI_KSNK' LIMIT 1
),
legacy AS (
  SELECT id AS legacy_id
  FROM public.sys_roles
  WHERE name IN ('TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK')
),
to_remap AS (
  SELECT DISTINCT ur.user_id
  FROM public.sys_user_roles ur
  JOIN legacy l ON l.legacy_id = ur.role_id
)
INSERT INTO public.sys_user_roles (user_id, role_id)
SELECT t.user_id, n.network_id
FROM to_remap t
CROSS JOIN network n
ON CONFLICT (user_id, role_id) DO NOTHING;

DELETE FROM public.sys_user_roles ur
USING public.sys_roles r
WHERE ur.role_id = r.id
  AND r.name IN ('TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK');

-- 3) Gỡ gán Ban QLCL / Khoa Trang bị (không còn trong nhóm phân quyền)
DELETE FROM public.sys_user_roles ur
USING public.sys_roles r
WHERE ur.role_id = r.id
  AND r.name IN ('BAN_QLCL', 'KHOA_TRANG_BI');

-- 4) Soft-deprecate 4 vai trò (giữ hàng, ngưng gán)
UPDATE public.sys_roles
SET
  is_active = false,
  description = CASE name
    WHEN 'TO_TRUONG_MANG_LUOI_KSNK' THEN 'DEPRECATED — gộp vào MANG_LUOI_KSNK'
    WHEN 'THANH_VIEN_MANG_LUOI_KSNK' THEN 'DEPRECATED — gộp vào MANG_LUOI_KSNK'
    WHEN 'BAN_QLCL' THEN 'DEPRECATED — không thuộc bộ vai trò KSNK gán quyền'
    WHEN 'KHOA_TRANG_BI' THEN 'DEPRECATED — không thuộc bộ vai trò KSNK gán quyền'
    ELSE description
  END,
  updated_at = now()
WHERE name IN (
  'TO_TRUONG_MANG_LUOI_KSNK',
  'THANH_VIEN_MANG_LUOI_KSNK',
  'BAN_QLCL',
  'KHOA_TRANG_BI'
);

-- 5) RPC: allowlist chỉ 4 vai trò staff + vẫn xóa legacy khi đổi vai trò
CREATE OR REPLACE FUNCTION public.rpc_assign_staff_ksnk_role(p_staff_id uuid, p_role_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_uid uuid;
  v_target_role_id uuid;
  v_ksnk_role_ids uuid[];
BEGIN
  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  IF p_role_name IS NULL OR upper(trim(p_role_name)) NOT IN (
    'HOI_DONG_KSNK', 'NHAN_VIEN_KSNK', 'MANG_LUOI_KSNK', 'KHACH_THONG_KE_GSTT'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vai trò không được phép gán. Chỉ: Hội đồng, Nhân viên KSNK, Mạng lưới KSNK, Khách.'
    );
  END IF;

  SELECT id INTO v_target_role_id
  FROM public.sys_roles
  WHERE name = upper(trim(p_role_name)) AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  SELECT array_agg(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN', 'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK', 'MANG_LUOI_KSNK', 'TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK',
    'KHACH_THONG_KE_GSTT', 'BAN_QLCL', 'KHOA_TRANG_BI'
  );

  DELETE FROM public.sys_user_roles
  WHERE user_id = v_uid
    AND role_id = ANY (coalesce(v_ksnk_role_ids, array[]::uuid[]));

  INSERT INTO public.sys_user_roles (user_id, role_id)
  VALUES (v_uid, v_target_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.rpc_assign_staff_ksnk_role(uuid, text) IS
  'Gán một vai trò KSNK/khách (Hội đồng | NV KSNK | Mạng lưới | Khách) — xóa các vai trò KSNK khác.';

-- 6) Preset quyền mạng lưới (seed-safe nếu permission đã có)
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
JOIN public.sys_permissions p ON true
WHERE r.name = 'MANG_LUOI_KSNK'
  AND (
    (p.module_name = 'DANH_MUC' AND p.action = 'view')
    OR (p.module_name = 'GIAM_SAT_NKBV' AND p.action = 'view')
    OR (p.module_name = 'BAO_SU_CO' AND p.action IN ('view', 'create'))
    OR (p.module_name IN ('GIAM_SAT_VST', 'GIAM_SAT_CHUNG', 'CONG_VIEC')
        AND p.action IN ('view', 'create', 'edit', 'delete'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
JOIN public.sys_permissions p ON true
WHERE r.name = 'HOI_DONG_KSNK'
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;
