-- Migration: Tái cấu trúc mã khu vực giám sát
-- Bỏ tiền tố nhóm màu (TR/DO/VA/XA) khỏi code, giữ nhom_mau trong metadata
-- Dữ liệu giám sát join bằng UUID nên AN TOÀN khi đổi code.

BEGIN;

-- ============================================================
-- 1. Đổi mã code trong sys_lookup_value
-- ============================================================

-- Vùng Trắng (TR)
UPDATE public.sys_lookup_value SET code = 'KV_PHONG_MO'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_MO';
UPDATE public.sys_lookup_value SET code = 'KV_CAN_THIEP'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CAN_THIEP';
UPDATE public.sys_lookup_value SET code = 'KV_PHONG_SINH'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_SINH';
UPDATE public.sys_lookup_value SET code = 'KV_ICU_SACH'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_ICU_SACH';
UPDATE public.sys_lookup_value SET code = 'KV_CSSD_SACH'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CSSD_SACH';
UPDATE public.sys_lookup_value SET code = 'KV_PHA_CHE'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHA_CHE';
UPDATE public.sys_lookup_value SET code = 'KV_NB_MIEN_DICH'   WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_NB_MIEN_DICH';
UPDATE public.sys_lookup_value SET code = 'KV_THU_THUAT_SACH' WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_THU_THUAT_SACH';

-- Vùng Đỏ (DO)
UPDATE public.sys_lookup_value SET code = 'KV_ICU_CHUNG'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_ICU_CHUNG';
UPDATE public.sys_lookup_value SET code = 'KV_LOC_MAU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_LOC_MAU';
UPDATE public.sys_lookup_value SET code = 'KV_CAP_CUU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CAP_CUU';
UPDATE public.sys_lookup_value SET code = 'KV_CACH_LY'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CACH_LY';
UPDATE public.sys_lookup_value SET code = 'KV_DA_KHANG'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_DA_KHANG';
UPDATE public.sys_lookup_value SET code = 'KV_CSSD_BAN'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CSSD_BAN';
UPDATE public.sys_lookup_value SET code = 'KV_CHAT_THAI'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CHAT_THAI';
UPDATE public.sys_lookup_value SET code = 'KV_VS_NGUY_CO_CAO' WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_VE_SINH';

-- Vùng Vàng (VA)
UPDATE public.sys_lookup_value SET code = 'KV_NOI_TRU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_NOI_TRU';
UPDATE public.sys_lookup_value SET code = 'KV_KHAM_TT'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_KHAM_TT';
UPDATE public.sys_lookup_value SET code = 'KV_CDHA'           WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_CDHA';
UPDATE public.sys_lookup_value SET code = 'KV_XET_NGHIEM'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_XET_NGHIEM';
UPDATE public.sys_lookup_value SET code = 'KV_VS_KHOA'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_VE_SINH';
UPDATE public.sys_lookup_value SET code = 'KV_BE_MAT_TBYT'    WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_BE_MAT_TBYT';

-- Vùng Xanh (XA)
UPDATE public.sys_lookup_value SET code = 'KV_HANH_CHINH'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_HANH_CHINH';
UPDATE public.sys_lookup_value SET code = 'KV_SANH_CHO'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_SANH_CHO';
UPDATE public.sys_lookup_value SET code = 'KV_NHAN_VIEN'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHAN_VIEN';
UPDATE public.sys_lookup_value SET code = 'KV_NHA_AN'         WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHA_AN';
UPDATE public.sys_lookup_value SET code = 'KV_BE_MAT_CC'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_BE_MAT';

-- ============================================================
-- 2. Đồng bộ specs.allowed_khu_vucs trong mdm_dm_khoa_phong
--    Thay mã cũ → mã mới trong JSONB array
-- ============================================================

UPDATE public.mdm_dm_khoa_phong
   SET specs = jsonb_set(
     COALESCE(specs, '{}'::jsonb),
     '{allowed_khu_vucs}',
     (
       SELECT COALESCE(jsonb_agg(
         CASE v.val
           -- TR
           WHEN 'KV_TR_PHONG_MO'       THEN '"KV_PHONG_MO"'::jsonb
           WHEN 'KV_TR_CAN_THIEP'      THEN '"KV_CAN_THIEP"'::jsonb
           WHEN 'KV_TR_PHONG_SINH'     THEN '"KV_PHONG_SINH"'::jsonb
           WHEN 'KV_TR_ICU_SACH'       THEN '"KV_ICU_SACH"'::jsonb
           WHEN 'KV_TR_CSSD_SACH'      THEN '"KV_CSSD_SACH"'::jsonb
           WHEN 'KV_TR_PHA_CHE'        THEN '"KV_PHA_CHE"'::jsonb
           WHEN 'KV_TR_NB_MIEN_DICH'   THEN '"KV_NB_MIEN_DICH"'::jsonb
           WHEN 'KV_TR_THU_THUAT_SACH' THEN '"KV_THU_THUAT_SACH"'::jsonb
           -- DO
           WHEN 'KV_DO_ICU_CHUNG'      THEN '"KV_ICU_CHUNG"'::jsonb
           WHEN 'KV_DO_LOC_MAU'        THEN '"KV_LOC_MAU"'::jsonb
           WHEN 'KV_DO_CAP_CUU'        THEN '"KV_CAP_CUU"'::jsonb
           WHEN 'KV_DO_CACH_LY'        THEN '"KV_CACH_LY"'::jsonb
           WHEN 'KV_DO_DA_KHANG'       THEN '"KV_DA_KHANG"'::jsonb
           WHEN 'KV_DO_CSSD_BAN'       THEN '"KV_CSSD_BAN"'::jsonb
           WHEN 'KV_DO_CHAT_THAI'      THEN '"KV_CHAT_THAI"'::jsonb
           WHEN 'KV_DO_VE_SINH'        THEN '"KV_VS_NGUY_CO_CAO"'::jsonb
           -- VA
           WHEN 'KV_VA_NOI_TRU'        THEN '"KV_NOI_TRU"'::jsonb
           WHEN 'KV_VA_KHAM_TT'        THEN '"KV_KHAM_TT"'::jsonb
           WHEN 'KV_VA_CDHA'           THEN '"KV_CDHA"'::jsonb
           WHEN 'KV_VA_XET_NGHIEM'     THEN '"KV_XET_NGHIEM"'::jsonb
           WHEN 'KV_VA_VE_SINH'        THEN '"KV_VS_KHOA"'::jsonb
           WHEN 'KV_VA_BE_MAT_TBYT'    THEN '"KV_BE_MAT_TBYT"'::jsonb
           -- XA
           WHEN 'KV_XA_HANH_CHINH'     THEN '"KV_HANH_CHINH"'::jsonb
           WHEN 'KV_XA_SANH_CHO'       THEN '"KV_SANH_CHO"'::jsonb
           WHEN 'KV_XA_NHAN_VIEN'      THEN '"KV_NHAN_VIEN"'::jsonb
           WHEN 'KV_XA_NHA_AN'         THEN '"KV_NHA_AN"'::jsonb
           WHEN 'KV_XA_BE_MAT'         THEN '"KV_BE_MAT_CC"'::jsonb
           ELSE to_jsonb(v.val)
         END
       ), '[]'::jsonb)
       FROM jsonb_array_elements_text(COALESCE(specs->'allowed_khu_vucs', '[]'::jsonb)) AS v(val)
     )
   )
 WHERE specs->'allowed_khu_vucs' IS NOT NULL
   AND jsonb_array_length(COALESCE(specs->'allowed_khu_vucs', '[]'::jsonb)) > 0;

-- ============================================================
-- 3. Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

COMMIT;
