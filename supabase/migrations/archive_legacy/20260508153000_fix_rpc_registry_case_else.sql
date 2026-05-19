-- Fix runtime error: "CASE statement is missing ELSE part."
-- rpc_get_registry_options receives category values from multiple modules.
-- Unknown/null category should be ignored instead of raising exception.

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
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_khoa as ten, ma_khoa as ma FROM public.dm_khoa_phong WHERE is_active = true ORDER BY ten_khoa) t));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_nghe_nghiep as ten, ma_nghe_nghiep as ma FROM public.dm_nghe_nghiep WHERE is_active = true ORDER BY ten_nghe_nghiep) t));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_chuc_vu as ten FROM public.dm_chuc_vu WHERE is_active = true ORDER BY ten_chuc_vu) t));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_to as ten FROM public.dm_to_cong_tac WHERE is_active = true ORDER BY ten_to) t));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_chuc_danh as ten FROM public.dm_chuc_danh WHERE is_active = true ORDER BY ten_chuc_danh) t));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, name as ten FROM public.dm_roles ORDER BY name) t));
      WHEN 'LOAI_CONG_VIEC' THEN
        v_result := v_result || jsonb_build_object('LOAI_CONG_VIEC', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_loai as ten, ma_loai as ma FROM public.dm_loai_cong_viec WHERE is_active = true ORDER BY created_at) t));
      WHEN 'TRANG_THAI_CONG_VIEC' THEN
        v_result := v_result || jsonb_build_object('TRANG_THAI_CONG_VIEC', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT id, ten_trang_thai as ten, ma_trang_thai as ma FROM public.dm_trang_thai_cong_viec WHERE is_active = true ORDER BY thu_tu) t));
      ELSE
        CONTINUE;
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;
