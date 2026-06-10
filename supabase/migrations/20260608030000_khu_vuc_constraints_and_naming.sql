-- Database Migration: Simplification of KHU_VUC_GIAM_SAT
-- Renames options, deactivates unused areas, adds department access rules in metadata,
-- and updates the view/RPC to expose metadata.

-- 1. Recreate the view to expose the metadata JSONB column
CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_khu_vuc,
    name AS ten_khu_vuc,
    is_active,
    created_at,
    updated_at,
    metadata ->> 'nhom_mau' AS nhom_mau,
    COALESCE((metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
    metadata -- Expose metadata
   FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

-- 2. Recreate the RPC function to select metadata
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
            SELECT id, ten_khoa AS ten, ma_khoa AS ma
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

-- 3. Deactivate secondary/unused green & WC areas
UPDATE public.sys_lookup_value
   SET is_active = false
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND code IN ('KV_XA_NHAN_VIEN', 'KV_XA_NHA_AN', 'KV_XA_BE_MAT', 'KV_DO_VE_SINH');

-- 4. Update names & metadata (with constraints mapping) in public.sys_lookup_value
-- A. Common areas (Hành chính, hành lang, WC, chất thải)
UPDATE public.sys_lookup_value
   SET name = 'Khu vực hành chính / Giao ban / Khác',
       metadata = '{"nhom_mau": "XA", "thu_tu": 401, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_HANH_CHINH';

UPDATE public.sys_lookup_value
   SET name = 'Hành lang / Sảnh chờ',
       metadata = '{"nhom_mau": "XA", "thu_tu": 402, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_SANH_CHO';

UPDATE public.sys_lookup_value
   SET name = 'Nhà vệ sinh / WC',
       metadata = '{"nhom_mau": "VA", "thu_tu": 305, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_VE_SINH';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "DO", "thu_tu": 207, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CHAT_THAI';

-- B. Clinical specific zones
UPDATE public.sys_lookup_value
   SET name = 'Phòng mổ',
       metadata = '{"nhom_mau": "TR", "thu_tu": 103, "allowed_khoas": ["B05"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_MO';

UPDATE public.sys_lookup_value
   SET name = 'Phòng can thiệp mạch',
       metadata = '{"nhom_mau": "TR", "thu_tu": 105, "allowed_khoas": ["A16", "C11"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CAN_THIEP';

UPDATE public.sys_lookup_value
   SET name = 'Phòng hồi sức chuyên sâu',
       metadata = '{"nhom_mau": "TR", "thu_tu": 101, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_ICU_SACH';

UPDATE public.sys_lookup_value
   SET name = 'Phòng hồi sức thường',
       metadata = '{"nhom_mau": "DO", "thu_tu": 201, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_ICU_CHUNG';

UPDATE public.sys_lookup_value
   SET name = 'Phòng cấp cứu',
       metadata = '{"nhom_mau": "DO", "thu_tu": 203, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CAP_CUU';

UPDATE public.sys_lookup_value
   SET name = 'Phòng lọc máu',
       metadata = '{"nhom_mau": "DO", "thu_tu": 202, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_LOC_MAU';

UPDATE public.sys_lookup_value
   SET name = 'Phòng thủ thuật',
       metadata = '{"nhom_mau": "TR", "thu_tu": 106, "allowed_khoas": ["B05", "A27", "B11", "B21", "A12", "B15", "B16", "B10", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_THU_THUAT_SACH';

UPDATE public.sys_lookup_value
   SET name = 'Phòng điều trị thường',
       metadata = '{"nhom_mau": "VA", "thu_tu": 301, "allowed_khoas": ["B10", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_NOI_TRU';

UPDATE public.sys_lookup_value
   SET name = 'Phòng khám',
       metadata = '{"nhom_mau": "VA", "thu_tu": 302, "allowed_khoas": ["C01"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_KHAM_TT';

UPDATE public.sys_lookup_value
   SET name = 'Phòng sinh',
       metadata = '{"nhom_mau": "TR", "thu_tu": 104, "allowed_khoas": ["B10"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_SINH';

-- Special areas (CSSD, Labs, Imaging)
UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "TR", "thu_tu": 107, "allowed_khoas": ["C18"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CSSD_SACH';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "DO", "thu_tu": 206, "allowed_khoas": ["C18"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CSSD_BAN';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "TR", "thu_tu": 108, "allowed_khoas": ["C18", "C05"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHA_CHE';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "VA", "thu_tu": 303, "allowed_khoas": ["C10", "C10-XQ", "C11", "C12", "C14", "C09"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_CDHA';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "VA", "thu_tu": 304, "allowed_khoas": ["C02", "C04", "C07", "C06"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_XET_NGHIEM';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "VA", "thu_tu": 306, "allowed_khoas": ["B05", "A27", "B11", "B21", "A12", "B15", "B16", "A16", "C11", "B10", "C01", "C10", "C10-XQ", "C12", "C14", "C09", "C02", "C04", "C07", "C06", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_BE_MAT_TBYT';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "TR", "thu_tu": 102, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B10", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_NB_MIEN_DICH';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "DO", "thu_tu": 204, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B10", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CACH_LY';

UPDATE public.sys_lookup_value
   SET metadata = '{"nhom_mau": "DO", "thu_tu": 205, "allowed_khoas": ["A27", "B11", "B21", "A12", "B15", "B16", "A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A14", "A15", "A17", "A19", "A20", "A21", "A26", "A29", "B01", "B02", "B04", "B06", "B07", "B08", "B09", "B10", "B12", "B14", "B17", "B18", "B19", "B20"]}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_DA_KHANG';

-- 5. Data Migration: Map old session/observation records pointing to deactivated IDs to representative active IDs
DO $$
DECLARE
  v_id_hanh_chinh UUID;
  v_id_nhan_vien UUID;
  v_id_nha_an UUID;
  v_id_be_mat UUID;
  v_id_wc_va UUID;
  v_id_wc_do UUID;
BEGIN
  -- Get IDs of target active lookups
  SELECT id INTO v_id_hanh_chinh FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_HANH_CHINH';
  SELECT id INTO v_id_wc_va FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_VE_SINH';

  -- Get IDs of deactivated lookups (might not exist or already be deactivated, we retrieve by code)
  SELECT id INTO v_id_nhan_vien FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHAN_VIEN';
  SELECT id INTO v_id_nha_an FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHA_AN';
  SELECT id INTO v_id_be_mat FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_BE_MAT';
  SELECT id INTO v_id_wc_do FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_VE_SINH';

  -- A. Update gstt_fact_vst
  IF v_id_hanh_chinh IS NOT NULL THEN
    UPDATE public.gstt_fact_vst SET khu_vuc_id = v_id_hanh_chinh WHERE khu_vuc_id IN (v_id_nhan_vien, v_id_nha_an, v_id_be_mat);
  END IF;
  IF v_id_wc_va IS NOT NULL THEN
    UPDATE public.gstt_fact_vst SET khu_vuc_id = v_id_wc_va WHERE khu_vuc_id = v_id_wc_do;
  END IF;

  -- B. Update gstt_fact_vst_sessions
  IF v_id_hanh_chinh IS NOT NULL THEN
    UPDATE public.gstt_fact_vst_sessions SET khu_vuc_id = v_id_hanh_chinh WHERE khu_vuc_id IN (v_id_nhan_vien, v_id_nha_an, v_id_be_mat);
  END IF;
  IF v_id_wc_va IS NOT NULL THEN
    UPDATE public.gstt_fact_vst_sessions SET khu_vuc_id = v_id_wc_va WHERE khu_vuc_id = v_id_wc_do;
  END IF;

  -- C. Update gstt_fact_chung_sessions
  IF v_id_hanh_chinh IS NOT NULL THEN
    UPDATE public.gstt_fact_chung_sessions SET khu_vuc_id = v_id_hanh_chinh WHERE khu_vuc_id IN (v_id_nhan_vien, v_id_nha_an, v_id_be_mat);
  END IF;
  IF v_id_wc_va IS NOT NULL THEN
    UPDATE public.gstt_fact_chung_sessions SET khu_vuc_id = v_id_wc_va WHERE khu_vuc_id = v_id_wc_do;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

