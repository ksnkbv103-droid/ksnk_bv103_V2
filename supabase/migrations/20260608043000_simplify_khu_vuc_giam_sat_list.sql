-- Database Migration: Simplify and align KHU_VUC_GIAM_SAT lookup values to 22 active areas
-- Deactivates 5 unused areas, updates names, colors, and sorting of the remaining 22 areas.

BEGIN;

-- 1. Deactivate the 5 omitted lookup values
UPDATE public.sys_lookup_value
   SET is_active = false,
       updated_at = now()
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND code IN ('KV_XA_NHAN_VIEN', 'KV_XA_NHA_AN', 'KV_XA_BE_MAT', 'KV_VA_BE_MAT_TBYT', 'KV_VA_KHAM_TT');

-- 2. Make sure the remaining 22 lookup values are active
UPDATE public.sys_lookup_value
   SET is_active = true,
       updated_at = now()
 WHERE category_type = 'KHU_VUC_GIAM_SAT'
   AND code IN (
     'KV_TR_PHONG_MO', 'KV_TR_CAN_THIEP', 'KV_TR_PHONG_SINH', 'KV_TR_ICU_SACH',
     'KV_TR_CSSD_SACH', 'KV_TR_PHA_CHE', 'KV_TR_NB_MIEN_DICH',
     'KV_DO_CAP_CUU', 'KV_DO_LOC_MAU', 'KV_DO_ICU_CHUNG', 'KV_DO_CACH_LY',
     'KV_DO_DA_KHANG', 'KV_DO_CSSD_BAN', 'KV_DO_CHAT_THAI', 'KV_TR_THU_THUAT_SACH', 'KV_DO_VE_SINH',
     'KV_VA_NOI_TRU', 'KV_VA_CDHA', 'KV_VA_XET_NGHIEM', 'KV_VA_VE_SINH',
     'KV_XA_HANH_CHINH', 'KV_XA_SANH_CHO'
   );

-- 3. Update names and metadata of the active lookup values
-- Vùng Trắng (TR) - Vô khuẩn cao / Nguy cơ rất cao (Đặc thù)
UPDATE public.sys_lookup_value
   SET name = 'Phòng mổ',
       metadata = '{"nhom_mau": "TR", "thu_tu": 101}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_MO';

UPDATE public.sys_lookup_value
   SET name = 'Phòng can thiệp mạch',
       metadata = '{"nhom_mau": "TR", "thu_tu": 102}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CAN_THIEP';

UPDATE public.sys_lookup_value
   SET name = 'Phòng sinh',
       metadata = '{"nhom_mau": "TR", "thu_tu": 103}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHONG_SINH';

UPDATE public.sys_lookup_value
   SET name = 'Phòng ICU ghép tạng',
       metadata = '{"nhom_mau": "TR", "thu_tu": 104}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_ICU_SACH';

UPDATE public.sys_lookup_value
   SET name = 'Trung tâm tiệt khuẩn — khu sạch',
       metadata = '{"nhom_mau": "TR", "thu_tu": 105}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_CSSD_SACH';

UPDATE public.sys_lookup_value
   SET name = 'Pha chế dịch / thuốc vô khuẩn',
       metadata = '{"nhom_mau": "TR", "thu_tu": 106}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_PHA_CHE';

UPDATE public.sys_lookup_value
   SET name = 'Khu NB suy giảm miễn dịch',
       metadata = '{"nhom_mau": "TR", "thu_tu": 107}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_NB_MIEN_DICH';

-- Vùng Đỏ (DO) - Phơi nhiễm cao / Nguy cơ cao (Đặc thù & Dùng chung)
UPDATE public.sys_lookup_value
   SET name = 'Khu cấp cứu',
       metadata = '{"nhom_mau": "DO", "thu_tu": 201}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CAP_CUU';

UPDATE public.sys_lookup_value
   SET name = 'Khu lọc máu',
       metadata = '{"nhom_mau": "DO", "thu_tu": 202}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_LOC_MAU';

UPDATE public.sys_lookup_value
   SET name = 'ICU chung (hồi sức thường)',
       metadata = '{"nhom_mau": "DO", "thu_tu": 203}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_ICU_CHUNG';

UPDATE public.sys_lookup_value
   SET name = 'Tiếp nhận / cách ly truyền nhiễm',
       metadata = '{"nhom_mau": "DO", "thu_tu": 204}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CACH_LY';

UPDATE public.sys_lookup_value
   SET name = 'Khu điều trị NB đa kháng kháng sinh',
       metadata = '{"nhom_mau": "DO", "thu_tu": 205}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_DA_KHANG';

UPDATE public.sys_lookup_value
   SET name = 'Trung tâm tiệt khuẩn — khu bẩn',
       metadata = '{"nhom_mau": "DO", "thu_tu": 206}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CSSD_BAN';

UPDATE public.sys_lookup_value
   SET name = 'Khu lưu chất thải y tế tạm',
       metadata = '{"nhom_mau": "DO", "thu_tu": 207, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_CHAT_THAI';

UPDATE public.sys_lookup_value
   SET name = 'Phòng thủ thuật vô khuẩn',
       metadata = '{"nhom_mau": "DO", "thu_tu": 208}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_TR_THU_THUAT_SACH';

UPDATE public.sys_lookup_value
   SET name = 'Nhà vệ sinh thuộc khu nguy cơ cao',
       metadata = '{"nhom_mau": "DO", "thu_tu": 209}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_DO_VE_SINH';

-- Vùng Vàng (VA) - Tiếp xúc bệnh nhân / Nguy cơ trung bình (Đặc thù & Dùng chung)
UPDATE public.sys_lookup_value
   SET name = 'Buồng bệnh nội trú thông thường',
       metadata = '{"nhom_mau": "VA", "thu_tu": 301}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_NOI_TRU';

UPDATE public.sys_lookup_value
   SET name = 'Chẩn đoán hình ảnh',
       metadata = '{"nhom_mau": "VA", "thu_tu": 302}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_CDHA';

UPDATE public.sys_lookup_value
   SET name = 'Khu xét nghiệm lâm sàng',
       metadata = '{"nhom_mau": "VA", "thu_tu": 303}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_XET_NGHIEM';

UPDATE public.sys_lookup_value
   SET name = 'WC & khu giữ đồ bẩn khoa lâm sàng',
       metadata = '{"nhom_mau": "VA", "thu_tu": 304, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_VA_VE_SINH';

-- Vùng Xanh (XA) - Hành chính / Nguy cơ thấp (Dùng chung & Khác)
UPDATE public.sys_lookup_value
   SET name = 'Khu hành chính / văn phòng',
       metadata = '{"nhom_mau": "XA", "thu_tu": 401, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_HANH_CHINH';

UPDATE public.sys_lookup_value
   SET name = 'Sảnh, hành lang, buồng chờ',
       metadata = '{"nhom_mau": "XA", "thu_tu": 402, "is_common": true}'::jsonb
 WHERE category_type = 'KHU_VUC_GIAM_SAT' AND code = 'KV_XA_SANH_CHO';

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
