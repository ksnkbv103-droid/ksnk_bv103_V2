-- Database Migration: Seed default allowed_khu_vucs in specs JSONB column for departments
-- Based on the professional nature of each department in BV103.

BEGIN;

-- First reset all departments specs.allowed_khu_vucs to empty array to ensure clean seed
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": []}'::jsonb;

-- 1. Khoa Gây mê hồi sức (B05)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_PHONG_MO", "KV_TR_THU_THUAT_SACH"]}'::jsonb
 WHERE ma_khoa = 'B05';

-- 2. Khoa Tim mạch can thiệp (A16), XQ can thiệp (C11)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_CAN_THIEP", "KV_TR_THU_THUAT_SACH"]}'::jsonb
 WHERE ma_khoa IN ('A16', 'C11');

-- 3. Hồi sức tích cực / ICU / Ghép tạng (A27, B21, A12, B15, B16)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_ICU_SACH", "KV_DO_ICU_CHUNG", "KV_DO_CAP_CUU", "KV_DO_LOC_MAU", "KV_DO_DA_KHANG"]}'::jsonb
 WHERE ma_khoa IN ('A27', 'B21', 'A12', 'B15', 'B16');

-- 4. Khoa Cấp cứu (B11)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_DO_CAP_CUU", "KV_DO_ICU_CHUNG", "KV_TR_THU_THUAT_SACH"]}'::jsonb
 WHERE ma_khoa = 'B11';

-- 5. Khoa Sản (B10)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_PHONG_SINH", "KV_TR_THU_THUAT_SACH", "KV_VA_NOI_TRU"]}'::jsonb
 WHERE ma_khoa = 'B10';

-- 6. Khoa Truyền nhiễm / Bệnh nhiệt đới (A26)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_DO_CACH_LY", "KV_DO_DA_KHANG", "KV_VA_NOI_TRU", "KV_TR_THU_THUAT_SACH"]}'::jsonb
 WHERE ma_khoa = 'A26';

-- 7. KSNK / CSSD / Dược (C18)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_TR_CSSD_SACH", "KV_DO_CSSD_BAN", "KV_TR_PHA_CHE"]}'::jsonb
 WHERE ma_khoa = 'C18';

-- 8. CĐHA (C10, C10-XQ, C12, C14, C09)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_CDHA"]}'::jsonb
 WHERE ma_khoa IN ('C10', 'C10-XQ', 'C12', 'C14', 'C09');

-- 9. Xét nghiệm (C02, C04, C07, C06)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_XET_NGHIEM"]}'::jsonb
 WHERE ma_khoa IN ('C02', 'C04', 'C07', 'C06');

-- 10. Khoa Khám bệnh (C01)
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": []}'::jsonb
 WHERE ma_khoa = 'C01';

-- 11. Các khoa lâm sàng (Nội, Ngoại) còn lại
UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{"allowed_khu_vucs": ["KV_VA_NOI_TRU", "KV_TR_THU_THUAT_SACH", "KV_TR_NB_MIEN_DICH", "KV_DO_DA_KHANG"]}'::jsonb
 WHERE ma_khoa IN (
   'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A14', 'A15', 'A17', 'A19', 'A20', 'A21', 'A29',
   'B01', 'B02', 'B04', 'B06', 'B07', 'B08', 'B09', 'B12', 'B14', 'B17', 'B18', 'B19', 'B20'
 );

-- Reload schema cache to ensure schema is synced
NOTIFY pgrst, 'reload schema';

COMMIT;
