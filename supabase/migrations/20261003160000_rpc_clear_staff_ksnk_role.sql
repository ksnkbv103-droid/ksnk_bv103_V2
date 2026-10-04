-- Soft-local S-Y: cho phép gỡ hết vai trò KSNK gán được khi hồ sơ bỏ vai trò.
-- p_role_name rỗng / NULL → chỉ DELETE sys_user_roles (nhóm KSNK), không INSERT.
-- KHÔNG tự apply — chờ Nghĩa migrate local.

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
    IF NOT (public.fn_sys_is_admin() OR public.fn_sys_has_permission('PHAN_QUYEN', 'edit')) THEN
      RETURN json_build_object('success', false, 'error', 'Không đủ quyền gán vai trò.');
    END IF;
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  SELECT array_agg(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN', 'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK', 'MANG_LUOI_KSNK', 'TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK',
    'KHACH_THONG_KE_GSTT', 'BAN_QLCL', 'KHOA_TRANG_BI'
  );

  -- Gỡ vai trò KSNK: hồ sơ đã bỏ vai_tro_he_thong_id nhưng vẫn còn quyền đăng nhập.
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

COMMENT ON FUNCTION public.rpc_assign_staff_ksnk_role(uuid, text) IS
  'Gán một vai trò KSNK (xoá các vai trò KSNK khác). p_role_name rỗng = chỉ gỡ vai trò KSNK.';

GRANT EXECUTE ON FUNCTION public.rpc_assign_staff_ksnk_role(uuid, text) TO authenticated, service_role;
