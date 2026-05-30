-- MIGRATION: 20260522000006_cleanup_khu_vuc_giam_sat.sql
-- DESCRIPTION: Chuyển đổi bảng danh mục phẳng cuối cùng dm_khu_vuc_giam_sat vào dm_lookup_value và tạo View tương thích ngược

BEGIN;

-- 1. Migrate dữ liệu sang dm_lookup_value
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT id, 'KHU_VUC_GIAM_SAT', ma_khu_vuc, ten_khu_vuc, is_active, created_at, updated_at
FROM public.dm_khu_vuc_giam_sat
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 2. Xóa bảng vật lý
DROP TABLE IF EXISTS public.dm_khu_vuc_giam_sat CASCADE;

-- 3. Tạo lại View tương thích ngược
CREATE OR REPLACE VIEW public.dm_khu_vuc_giam_sat WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_khu_vuc,
  name AS ten_khu_vuc,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'KHU_VUC_GIAM_SAT';

COMMENT ON VIEW public.dm_khu_vuc_giam_sat IS 'View tương thích ngược cho Khu vực giám sát, trỏ sang dm_lookup_value (KHU_VUC_GIAM_SAT).';

COMMIT;
