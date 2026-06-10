-- Database Migration: Seed all 18 specific allowed_khu_vucs to specs JSONB column for all departments
-- Allows administrators to custom select/deselect areas in the catalog UI.

BEGIN;

UPDATE public.mdm_dm_khoa_phong
   SET specs = COALESCE(specs, '{}'::jsonb) || '{
     "allowed_khu_vucs": [
       "KV_TR_PHONG_MO", "KV_TR_CAN_THIEP", "KV_TR_PHONG_SINH", "KV_TR_ICU_SACH",
       "KV_TR_CSSD_SACH", "KV_TR_PHA_CHE", "KV_TR_NB_MIEN_DICH",
       "KV_DO_CAP_CUU", "KV_DO_LOC_MAU", "KV_DO_ICU_CHUNG", "KV_DO_CACH_LY",
       "KV_DO_DA_KHANG", "KV_DO_CSSD_BAN", "KV_TR_THU_THUAT_SACH", "KV_DO_VE_SINH",
       "KV_VA_NOI_TRU", "KV_VA_CDHA", "KV_VA_XET_NGHIEM"
     ]
   }'::jsonb;

NOTIFY pgrst, 'reload schema';

COMMIT;
