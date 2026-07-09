-- Cho phép gán vai trò KHACH_THONG_KE_GSTT qua rpc_assign_staff_ksnk_role (loại trừ lẫn nhau với vai trò KSNK khác).

BEGIN;

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

  SELECT id INTO v_target_role_id
  FROM public.sys_roles
  WHERE name = p_role_name AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  SELECT array_agg(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN', 'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK', 'MANG_LUOI_KSNK', 'TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK',
    'KHACH_THONG_KE_GSTT'
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
  'Gán một vai trò KSNK/khách — xóa các vai trò KSNK khác (gồm KHACH_THONG_KE_GSTT).';

NOTIFY pgrst, 'reload schema';

COMMIT;
