-- Database Migration: Configure dynamic allowed supervision areas inside department specs JSONB
-- Updates RPC get_registry_options to return specs, adds is_common to common lookups,
-- and maps supervision areas inside department specifications.

BEGIN;

-- 1. Update public.rpc_get_registry_options to return 'specs' for 'KHOA_PHONG'
CREATE OR REPLACE FUNCTION public.rpc_get_registry_options(p_categories text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO public, pg_catalog
    AS $$
DECLARE
  v_result JSONB := '{}'::jsonb;
  v_cat TEXT;
BEGIN
  FOREACH v_cat IN ARRAY p_categories LOOP
    CASE v_cat
      WHEN 'KHOA_PHONG' THEN
        v_result := v_result || jsonb_build_object('KHOA_PHONG', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_khoa AS ten, ma_khoa AS ma, specs
              FROM public.mdm_dm_khoa_phong WHERE is_active = true
          ) t
        ));
      WHEN 'NGHE_NGHIEP' THEN
        v_result := v_result || jsonb_build_object('NGHE_NGHIEP', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'NGHE_NGHIEP' AND is_active = true
          ) t
        ));
      WHEN 'CHUC_VU' THEN
        v_result := v_result || jsonb_build_object('CHUC_VU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_chuc_vu AS ten FROM public.mdm_dm_chuc_vu WHERE is_active = true
          ) t
        ));
      WHEN 'TO_CONG_TAC' THEN
        v_result := v_result || jsonb_build_object('TO_CONG_TAC', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_to AS ten FROM public.mdm_dm_to_cong_tac WHERE is_active = true
          ) t
        ));
      WHEN 'CHUC_DANH' THEN
        v_result := v_result || jsonb_build_object('CHUC_DANH', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_chuc_danh AS ten FROM public.mdm_dm_chuc_danh WHERE is_active = true
          ) t
        ));
      WHEN 'ROLE' THEN
        v_result := v_result || jsonb_build_object('ROLE', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, name AS ten FROM public.sys_roles
          ) t
        ));
      WHEN 'LOAI_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('LOAI_DUNG_CU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_loai_dung_cu AS ten, ma_loai_dung_cu AS ma
              FROM public.cssd_dm_loai_dung_cu WHERE is_active = true
          ) t
        ));
      WHEN 'BO_DUNG_CU' THEN
        v_result := v_result || jsonb_build_object('BO_DUNG_CU', (
          SELECT json_agg(t ORDER BY t.ten) FROM (
            SELECT id, ten_bo AS ten, ma_bo AS ma FROM public.cssd_dm_bo_dung_cu WHERE is_active = true
          ) t
        ));
      WHEN 'KHU_VUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('KHU_VUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, ten_khu_vuc AS ten, ma_khu_vuc AS ma, nhom_mau, thu_tu, metadata
              FROM public.gstt_dm_khu_vuc_giam_sat WHERE is_active = true
          ) t
        ));
      WHEN 'HINH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('HINH_THUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'HINH_THUC_GIAM_SAT' AND is_active = true
          ) t
        ));
      WHEN 'CACH_THUC_GIAM_SAT' THEN
        v_result := v_result || jsonb_build_object('CACH_THUC_GIAM_SAT', (
          SELECT json_agg(t ORDER BY t.thu_tu, t.ten) FROM (
            SELECT id, name AS ten, code AS ma,
                   COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu
              FROM public.sys_lookup_value
             WHERE category_type = 'CACH_THUC_GIAM_SAT' AND is_active = true
          ) t
        ));
      ELSE
        NULL;
    END CASE;
  END LOOP;
  RETURN v_result;
END;
$$;

-- 2. Mark common areas (WC, Hành lang, Giao ban, Chất thải) as 'is_common: true' in their metadata lookup
UPDATE public.sys_lookup_value
   SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND code IN ('KV_XA_HANH_CHINH', 'KV_XA_SANH_CHO', 'KV_VA_VE_SINH', 'KV_DO_CHAT_THAI');

-- 3. Configure specs allowed_khu_vucs for Clinical and Special departments
-- A. Gây mê hồi sức (B05)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_PHONG_MO", "KV_TR_THU_THUAT_SACH", "KV_VA_BE_MAT_TBYT"]}'::jsonb
 WHERE ma_khoa = 'B05';

-- B. Tim mạch can thiệp (A16), XQ can thiệp (C11)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_CAN_THIEP", "KV_TR_THU_THUAT_SACH", "KV_VA_BE_MAT_TBYT"]}'::jsonb
 WHERE ma_khoa IN ('A16', 'C11');

-- C. Hồi sức tích cực, Cấp cứu, Lọc máu (A27, B11, B21, A12, B15, B16)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_ICU_SACH", "KV_DO_ICU_CHUNG", "KV_DO_CAP_CUU", "KV_DO_LOC_MAU", "KV_TR_THU_THUAT_SACH", "KV_VA_BE_MAT_TBYT"]}'::jsonb
 WHERE ma_khoa IN ('A27', 'B11', 'B21', 'A12', 'B15', 'B16');

-- D. Sản khoa (B10)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_PHONG_SINH", "KV_TR_THU_THUAT_SACH", "KV_VA_NOI_TRU", "KV_VA_BE_MAT_TBYT", "KV_TR_NB_MIEN_DICH"]}'::jsonb
 WHERE ma_khoa = 'B10';

-- E. Khoa KSNK / CSSD (C18)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_CSSD_SACH", "KV_DO_CSSD_BAN", "KV_TR_PHA_CHE"]}'::jsonb
 WHERE ma_khoa = 'C18';

-- F. Chẩn đoán hình ảnh (C10, C10-XQ, C12, C14, C09)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_CDHA"]}'::jsonb
 WHERE ma_khoa IN ('C10', 'C10-XQ', 'C12', 'C14', 'C09');

-- G. Xét nghiệm (C02, C04, C07, C06)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_XET_NGHIEM"]}'::jsonb
 WHERE ma_khoa IN ('C02', 'C04', 'C07', 'C06');

-- H. Khoa Khám bệnh (C01)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_KHAM_TT"]}'::jsonb
 WHERE ma_khoa = 'C01';

-- I. Các khoa lâm sàng điều trị thông thường còn lại
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_NOI_TRU", "KV_TR_THU_THUAT_SACH", "KV_VA_BE_MAT_TBYT", "KV_TR_NB_MIEN_DICH", "KV_DO_CACH_LY", "KV_DO_DA_KHANG"]}'::jsonb
 WHERE ma_khoa IN (
   'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A14', 'A15', 'A17', 'A19', 'A20', 'A21', 'A26', 'A29',
   'B01', 'B02', 'B04', 'B06', 'B07', 'B08', 'B09', 'B12', 'B14', 'B17', 'B18', 'B19', 'B20'
 );

NOTIFY pgrst, 'reload schema';

COMMIT;
