-- SSOT cleanup: idempotent guard sau chuỗi khu vực + DROP compat sót + dọn RPC legacy.
-- Chạy an toàn trên DB đã apply 20260608050000 / 20260610100000 / 20260611100000.

BEGIN;

-- ============================================================
-- 1. Khu vực giám sát — mã SSOT (bỏ tiền tố TR/DO/VA/XA) + is_active 22 khu
--    (Idempotent replay 20260608043000 + 20260608050000 cho seed/db lệch)
-- ============================================================

UPDATE public.sys_lookup_value SET code = 'KV_PHONG_MO'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_MO';
UPDATE public.sys_lookup_value SET code = 'KV_CAN_THIEP'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CAN_THIEP';
UPDATE public.sys_lookup_value SET code = 'KV_PHONG_SINH'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_SINH';
UPDATE public.sys_lookup_value SET code = 'KV_ICU_SACH'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_ICU_SACH';
UPDATE public.sys_lookup_value SET code = 'KV_CSSD_SACH'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CSSD_SACH';
UPDATE public.sys_lookup_value SET code = 'KV_PHA_CHE'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHA_CHE';
UPDATE public.sys_lookup_value SET code = 'KV_NB_MIEN_DICH'   WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_NB_MIEN_DICH';
UPDATE public.sys_lookup_value SET code = 'KV_THU_THUAT_SACH' WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_THU_THUAT_SACH';
UPDATE public.sys_lookup_value SET code = 'KV_ICU_CHUNG'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_ICU_CHUNG';
UPDATE public.sys_lookup_value SET code = 'KV_LOC_MAU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_LOC_MAU';
UPDATE public.sys_lookup_value SET code = 'KV_CAP_CUU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CAP_CUU';
UPDATE public.sys_lookup_value SET code = 'KV_CACH_LY'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CACH_LY';
UPDATE public.sys_lookup_value SET code = 'KV_DA_KHANG'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_DA_KHANG';
UPDATE public.sys_lookup_value SET code = 'KV_CSSD_BAN'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CSSD_BAN';
UPDATE public.sys_lookup_value SET code = 'KV_CHAT_THAI'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CHAT_THAI';
UPDATE public.sys_lookup_value SET code = 'KV_VS_NGUY_CO_CAO' WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code IN ('KV_DO_VE_SINH', 'KV_DO_VS_NGUY_CO_CAO');
UPDATE public.sys_lookup_value SET code = 'KV_NOI_TRU'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_NOI_TRU';
UPDATE public.sys_lookup_value SET code = 'KV_KHAM_TT'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_KHAM_TT';
UPDATE public.sys_lookup_value SET code = 'KV_CDHA'           WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_CDHA';
UPDATE public.sys_lookup_value SET code = 'KV_XET_NGHIEM'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_XET_NGHIEM';
UPDATE public.sys_lookup_value SET code = 'KV_VS_KHOA'        WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_VE_SINH';
UPDATE public.sys_lookup_value SET code = 'KV_BE_MAT_TBYT'    WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_BE_MAT_TBYT';
UPDATE public.sys_lookup_value SET code = 'KV_HANH_CHINH'     WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_HANH_CHINH';
UPDATE public.sys_lookup_value SET code = 'KV_SANH_CHO'       WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_SANH_CHO';
UPDATE public.sys_lookup_value SET code = 'KV_NHAN_VIEN'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHAN_VIEN';
UPDATE public.sys_lookup_value SET code = 'KV_NHA_AN'         WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_NHA_AN';
UPDATE public.sys_lookup_value SET code = 'KV_BE_MAT_CC'      WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_BE_MAT';

UPDATE public.sys_lookup_value
   SET is_active = false, updated_at = now()
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND code IN ('KV_NHAN_VIEN', 'KV_NHA_AN', 'KV_BE_MAT_CC', 'KV_BE_MAT_TBYT', 'KV_KHAM_TT');

-- specs.allowed_khu_vucs: map mã cũ → mới (idempotent)
UPDATE public.mdm_dm_khoa_phong
   SET specs = jsonb_set(
     COALESCE(specs, '{}'::jsonb),
     '{allowed_khu_vucs}',
     (
       SELECT COALESCE(jsonb_agg(
         CASE v.val
           WHEN 'KV_TR_PHONG_MO' THEN '"KV_PHONG_MO"'::jsonb
           WHEN 'KV_TR_CAN_THIEP' THEN '"KV_CAN_THIEP"'::jsonb
           WHEN 'KV_TR_PHONG_SINH' THEN '"KV_PHONG_SINH"'::jsonb
           WHEN 'KV_TR_ICU_SACH' THEN '"KV_ICU_SACH"'::jsonb
           WHEN 'KV_TR_CSSD_SACH' THEN '"KV_CSSD_SACH"'::jsonb
           WHEN 'KV_TR_PHA_CHE' THEN '"KV_PHA_CHE"'::jsonb
           WHEN 'KV_TR_NB_MIEN_DICH' THEN '"KV_NB_MIEN_DICH"'::jsonb
           WHEN 'KV_TR_THU_THUAT_SACH' THEN '"KV_THU_THUAT_SACH"'::jsonb
           WHEN 'KV_DO_ICU_CHUNG' THEN '"KV_ICU_CHUNG"'::jsonb
           WHEN 'KV_DO_LOC_MAU' THEN '"KV_LOC_MAU"'::jsonb
           WHEN 'KV_DO_CAP_CUU' THEN '"KV_CAP_CUU"'::jsonb
           WHEN 'KV_DO_CACH_LY' THEN '"KV_CACH_LY"'::jsonb
           WHEN 'KV_DO_DA_KHANG' THEN '"KV_DA_KHANG"'::jsonb
           WHEN 'KV_DO_CSSD_BAN' THEN '"KV_CSSD_BAN"'::jsonb
           WHEN 'KV_DO_CHAT_THAI' THEN '"KV_CHAT_THAI"'::jsonb
           WHEN 'KV_DO_VE_SINH' THEN '"KV_VS_NGUY_CO_CAO"'::jsonb
           WHEN 'KV_VA_NOI_TRU' THEN '"KV_NOI_TRU"'::jsonb
           WHEN 'KV_VA_KHAM_TT' THEN '"KV_KHAM_TT"'::jsonb
           WHEN 'KV_VA_CDHA' THEN '"KV_CDHA"'::jsonb
           WHEN 'KV_VA_XET_NGHIEM' THEN '"KV_XET_NGHIEM"'::jsonb
           WHEN 'KV_VA_VE_SINH' THEN '"KV_VS_KHOA"'::jsonb
           WHEN 'KV_VA_BE_MAT_TBYT' THEN '"KV_BE_MAT_TBYT"'::jsonb
           WHEN 'KV_XA_HANH_CHINH' THEN '"KV_HANH_CHINH"'::jsonb
           WHEN 'KV_XA_SANH_CHO' THEN '"KV_SANH_CHO"'::jsonb
           WHEN 'KV_XA_NHAN_VIEN' THEN '"KV_NHAN_VIEN"'::jsonb
           WHEN 'KV_XA_NHA_AN' THEN '"KV_NHA_AN"'::jsonb
           WHEN 'KV_XA_BE_MAT' THEN '"KV_BE_MAT_CC"'::jsonb
           ELSE to_jsonb(v.val)
         END
       ), '[]'::jsonb)
       FROM jsonb_array_elements_text(COALESCE(specs->'allowed_khu_vucs', '[]'::jsonb)) AS v(val)
     )
   )
 WHERE specs->'allowed_khu_vucs' IS NOT NULL
   AND jsonb_array_length(COALESCE(specs->'allowed_khu_vucs', '[]'::jsonb)) > 0;

-- ============================================================
-- 2. DROP compat views / orphan functions (20260602180000 follow-up)
-- ============================================================

DROP VIEW IF EXISTS public.dm_tram_cssd CASCADE;
DROP VIEW IF EXISTS public.dm_khoa_phong CASCADE;
DROP VIEW IF EXISTS public.dm_bang_kiem CASCADE;
DROP VIEW IF EXISTS public.fact_cong_viec CASCADE;
DROP VIEW IF EXISTS public.fact_giam_sat_vst_sessions CASCADE;
DROP VIEW IF EXISTS public.fact_giam_sat_chung_sessions CASCADE;

DROP FUNCTION IF EXISTS public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay();

-- Rewrite any function body still referencing dm_tram_cssd → cssd_dm_tram
DO $rewrite$
DECLARE
  r record;
  olddef text;
  newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) LIKE '%dm_tram_cssd%'
  LOOP
    olddef := pg_get_functiondef(r.oid);
    newdef := replace(olddef, 'public.dm_tram_cssd', 'public.cssd_dm_tram');
    IF newdef IS DISTINCT FROM olddef THEN
      EXECUTE newdef;
    END IF;
  END LOOP;
END
$rewrite$;

-- ============================================================
-- 3. GSTT summary: đảm bảo không còn TABLE pre-agg (chỉ VIEW live)
-- ============================================================

DO $drop_summary$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE 'gstt_fact_%summary%'
  LOOP
    EXECUTE format('DROP TABLE public.%I CASCADE', r.relname);
  END LOOP;
END
$drop_summary$;

NOTIFY pgrst, 'reload schema';

COMMIT;
