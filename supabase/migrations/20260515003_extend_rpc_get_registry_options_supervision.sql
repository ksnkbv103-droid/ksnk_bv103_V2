-- Extend rpc_get_registry_options to support supervision types and methods
CREATE OR REPLACE FUNCTION "public"."rpc_get_registry_options"("p_categories" "text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_cat TEXT;
BEGIN
  FOREACH v_cat IN ARRAY p_categories LOOP
    CASE v_cat
      WHEN 'KHOA_PHONG' THEN
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (SELECT json_agg(t) FROM (SELECT id, ten_khoa as ten, ma_khoa as ma FROM public.dm_khoa_phong WHERE is_active = true ORDER BY ten_khoa) t));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (SELECT json_agg(t) FROM (SELECT id, ten_nghe_nghiep as ten, ma_nghe_nghiep as ma FROM public.dm_nghe_nghiep WHERE is_active = true ORDER BY ten_nghe_nghiep) t));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_vu as ten FROM public.dm_chuc_vu WHERE is_active = true ORDER BY ten_chuc_vu) t));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (SELECT json_agg(t) FROM (SELECT id, ten_to as ten FROM public.dm_to_cong_tac WHERE is_active = true ORDER BY ten_to) t));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (SELECT json_agg(t) FROM (SELECT id, ten_chuc_danh as ten FROM public.dm_chuc_danh WHERE is_active = true ORDER BY ten_chuc_danh) t));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (SELECT json_agg(t) FROM (SELECT id, name as ten FROM public.dm_roles ORDER BY name) t));
      WHEN 'LOAI_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('LOAI_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_loai_dung_cu as ten, ma_loai_dung_cu as ma FROM public.dm_loai_dung_cu WHERE is_active = true ORDER BY ten_loai_dung_cu) t));
      WHEN 'BO_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('BO_DUNG_CU', (SELECT json_agg(t) FROM (SELECT id, ten_bo as ten, ma_bo as ma FROM public.dm_bo_dung_cu WHERE is_active = true ORDER BY ten_bo) t));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_khu_vuc as ten, ma_khu_vuc as ma FROM public.dm_khu_vuc_giam_sat WHERE is_active = true ORDER BY ten_khu_vuc) t));
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_hinh_thuc as ten, ma_hinh_thuc as ma FROM public.dm_hinh_thuc_giam_sat WHERE is_active = true ORDER BY ten_hinh_thuc) t));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (SELECT json_agg(t) FROM (SELECT id, ten_cach_thuc as ten, ma_cach_thuc as ma FROM public.dm_cach_thuc_giam_sat WHERE is_active = true ORDER BY ten_cach_thuc) t));
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;
