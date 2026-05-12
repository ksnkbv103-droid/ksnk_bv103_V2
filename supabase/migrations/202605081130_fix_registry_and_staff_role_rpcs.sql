-- Harden admin RPC contracts:
-- 1) rpc_get_registry_options: restore KHU_VUC_GIAM_SAT + safe ELSE CONTINUE.
-- 2) rpc_assign_staff_ksnk_role: align with current KSNK role set.

CREATE OR REPLACE FUNCTION public.rpc_get_registry_options(p_categories text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_cat TEXT;
BEGIN
  FOREACH v_cat IN ARRAY p_categories LOOP
    CASE v_cat
      WHEN 'KHOA_PHONG' THEN
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (SELECT json_agg(t) FROM (SELECT id, ten_khoa as ten, ma_khoa as ma FROM public.dm_khoa_phong WHERE is_active = true ORDER BY ten_khoa) t));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_khu_vuc as ten, ma_khu_vuc as ma FROM public.dm_khu_vuc_giam_sat WHERE is_active = true ORDER BY ten_khu_vuc) t));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (SELECT json_agg(t) FROM (SELECT id, ten_nghe_nghiep as ten, ma_nghe_nghiep as ma FROM public.dm_nghe_nghiep WHERE is_active = true ORDER BY ten_nghe_nghiep) t));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_vu as ten FROM public.dm_chuc_vu WHERE is_active = true ORDER BY ten_chuc_vu) t));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (SELECT json_agg(t) FROM (SELECT id, ten_to as ten FROM public.dm_to_cong_tac WHERE is_active = true ORDER BY ten_to) t));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_danh as ten FROM public.dm_chuc_danh WHERE is_active = true ORDER BY ten_chuc_danh) t));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (SELECT json_agg(t) FROM (SELECT id, name as ten FROM public.dm_roles WHERE is_active = true ORDER BY name) t));
      WHEN 'LOAI_CONG_VIEC' THEN
        v_result := v_result || jsonb_build_object('LOAI_CONG_VIEC', (SELECT json_agg(t) FROM (SELECT id, ten_loai as ten, ma_loai as ma FROM public.dm_loai_cong_viec WHERE is_active = true ORDER BY created_at) t));
      WHEN 'TRANG_THAI_CONG_VIEC' THEN
        v_result := v_result || jsonb_build_object('TRANG_THAI_CONG_VIEC', (SELECT json_agg(t) FROM (SELECT id, ten_trang_thai as ten, ma_trang_thai as ma FROM public.dm_trang_thai_cong_viec WHERE is_active = true ORDER BY thu_tu) t));
      ELSE
        CONTINUE;
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_assign_staff_ksnk_role(p_staff_id uuid, p_role_name text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid UUID;
  v_target_role_id UUID;
  v_ksnk_role_ids UUID[];
BEGIN
  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  SELECT id INTO v_target_role_id
  FROM public.dm_roles
  WHERE name = p_role_name AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  -- Chỉ xóa nhóm vai trò KSNK hệ thống, không đụng các role ngoài phạm vi.
  SELECT ARRAY_AGG(id) INTO v_ksnk_role_ids
  FROM public.dm_roles
  WHERE name IN (
    'CAN_BO_KSNK',
    'NHAN_VIEN_KHOA',
    'GIAM_SAT_VIEN',
    'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK',
    'MANG_LUOI_KSNK',
    'TO_TRUONG_MANG_LUOI_KSNK',
    'THANH_VIEN_MANG_LUOI_KSNK'
  );

  DELETE FROM public.rel_user_roles
  WHERE user_id = v_uid
    AND role_id = ANY(COALESCE(v_ksnk_role_ids, ARRAY[]::uuid[]));

  INSERT INTO public.rel_user_roles(user_id, role_id)
  VALUES (v_uid, v_target_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
