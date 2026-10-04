-- ADM-03: siết policy sys_user_roles / sys_role_permissions (chỉ ADMIN ghi);
-- RPC gán vai trò admin-only + chặn tự gán; RPC lưu ma trận nguyên tử.
-- FILE ONLY — chưa apply. Idempotent.

BEGIN;

-- 1) Policy ghi: chỉ fn_sys_is_admin (PHAN_QUYEN.create không đủ chèn ADMIN)
DROP POLICY IF EXISTS sys_user_roles_insert ON public.sys_user_roles;
DROP POLICY IF EXISTS sys_user_roles_update ON public.sys_user_roles;
DROP POLICY IF EXISTS sys_user_roles_delete ON public.sys_user_roles;
CREATE POLICY sys_user_roles_insert ON public.sys_user_roles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_user_roles_update ON public.sys_user_roles
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_user_roles_delete ON public.sys_user_roles
  FOR DELETE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS sys_role_permissions_insert ON public.sys_role_permissions;
DROP POLICY IF EXISTS sys_role_permissions_update ON public.sys_role_permissions;
DROP POLICY IF EXISTS sys_role_permissions_delete ON public.sys_role_permissions;
CREATE POLICY sys_role_permissions_insert ON public.sys_role_permissions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_role_permissions_update ON public.sys_role_permissions
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_role_permissions_delete ON public.sys_role_permissions
  FOR DELETE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

-- 2) RPC gán vai trò: chỉ ADMIN; cấm tự gán; giữ clear khi p_role_name rỗng
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
  v_role_trim text := nullif(trim(coalesce(p_role_name, '')), '');
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Chưa đăng nhập.');
    END IF;
    IF NOT public.fn_sys_is_admin() THEN
      RETURN json_build_object('success', false, 'error', 'Chỉ quản trị hệ thống được gán vai trò.');
    END IF;
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' AND v_uid IS NOT DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Không được tự gán/gỡ vai trò của chính mình.');
  END IF;

  SELECT array_agg(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN', 'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK', 'MANG_LUOI_KSNK', 'TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK',
    'KHACH_THONG_KE_GSTT', 'BAN_QLCL', 'KHOA_TRANG_BI'
  );

  IF v_role_trim IS NULL THEN
    DELETE FROM public.sys_user_roles
    WHERE user_id = v_uid
      AND role_id = ANY (coalesce(v_ksnk_role_ids, array[]::uuid[]));
    RETURN json_build_object('success', true, 'cleared', true);
  END IF;

  IF upper(v_role_trim) NOT IN (
    'HOI_DONG_KSNK', 'NHAN_VIEN_KSNK', 'MANG_LUOI_KSNK', 'KHACH_THONG_KE_GSTT'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vai trò không được phép gán. Chỉ: Hội đồng, Nhân viên KSNK, Mạng lưới KSNK, Khách.'
    );
  END IF;

  SELECT id INTO v_target_role_id
  FROM public.sys_roles
  WHERE name = upper(v_role_trim) AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

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

-- 3) Lưu ma trận nguyên tử
CREATE OR REPLACE FUNCTION public.rpc_save_rbac_matrix(p_rows jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_admin_role_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Chưa đăng nhập.');
    END IF;
    IF NOT public.fn_sys_is_admin() THEN
      RETURN json_build_object('success', false, 'error', 'Chỉ quản trị hệ thống được sửa ma trận quyền.');
    END IF;
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN json_build_object('success', false, 'error', 'Payload ma trận không hợp lệ.');
  END IF;

  DELETE FROM public.sys_role_permissions;

  INSERT INTO public.sys_role_permissions (role_id, permission_id)
  SELECT DISTINCT (e.elem->>'role_id')::uuid, (e.elem->>'permission_id')::uuid
  FROM jsonb_array_elements(p_rows) AS e(elem)
  WHERE nullif(e.elem->>'role_id', '') IS NOT NULL
    AND nullif(e.elem->>'permission_id', '') IS NOT NULL
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_admin_role_id FROM public.sys_roles WHERE name = 'ADMIN' LIMIT 1;
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO public.sys_role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, p.id
    FROM public.sys_permissions p
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.rpc_save_rbac_matrix(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_save_rbac_matrix(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_assign_staff_ksnk_role(uuid, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.rpc_save_rbac_matrix(jsonb) IS
  'ADM-03: lưu ma trận sys_role_permissions trong 1 transaction.';

COMMIT;
