-- Migration: Consolidate dm_khoi_khoa, dm_tram_cssd, and dm_vi_tri_kho into dm_lookup_value and replace with Views
-- Date: 22/05/2026

-- ----------------------------------------------------
-- 1. Migrate current data into dm_lookup_value
-- ----------------------------------------------------

-- dm_khoi_khoa -> KHOI_KHOA
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT id, 'KHOI_KHOA', ma_khoi, ten_khoi, is_active, created_at, updated_at
FROM public.dm_khoi_khoa
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- dm_vi_tri_kho -> VI_TRI_KHO
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT id, 'VI_TRI_KHO', ma_vi_tri, ten_vi_tri, is_active, created_at, updated_at
FROM public.dm_vi_tri_kho
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- dm_tram_cssd -> TRAM_CSSD (saving thu_tu in metadata jsonb)
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, metadata, created_at, updated_at)
SELECT id, 'TRAM_CSSD', ma_tram, ten_tram, is_active, jsonb_build_object('thu_tu', thu_tu), created_at, updated_at
FROM public.dm_tram_cssd
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active, metadata = EXCLUDED.metadata;


-- ----------------------------------------------------
-- 2. Drop legacy foreign key constraints
-- ----------------------------------------------------
ALTER TABLE public.dm_khoa_phong DROP CONSTRAINT IF EXISTS dm_khoa_phong_khoi_id_fkey;
ALTER TABLE public.fact_quy_trinh DROP CONSTRAINT IF EXISTS fact_quy_trinh_vi_tri_kho_id_fkey;
ALTER TABLE public.fact_quy_trinh DROP CONSTRAINT IF EXISTS fk_quy_trinh_tram_hien_tai;


-- ----------------------------------------------------
-- 3. Drop legacy physical tables (using CASCADE to clean up dependent views)
-- ----------------------------------------------------
DROP TABLE IF EXISTS public.dm_khoi_khoa CASCADE;
DROP TABLE IF EXISTS public.dm_vi_tri_kho CASCADE;
DROP TABLE IF EXISTS public.dm_tram_cssd CASCADE;


-- ----------------------------------------------------
-- 4. Recreate them as backward-compatible SQL Views pointing to dm_lookup_value
-- ----------------------------------------------------

-- dm_khoi_khoa view
CREATE OR REPLACE VIEW public.dm_khoi_khoa WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_khoi,
  name AS ten_khoi,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'KHOI_KHOA';

-- dm_vi_tri_kho view
CREATE OR REPLACE VIEW public.dm_vi_tri_kho WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_vi_tri,
  name AS ten_vi_tri,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'VI_TRI_KHO';

-- dm_tram_cssd view (extracting thu_tu dynamically from metadata JSONB)
CREATE OR REPLACE VIEW public.dm_tram_cssd WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_tram,
  name AS ten_tram,
  COALESCE((metadata->>'thu_tu')::smallint, 0::smallint) AS thu_tu,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'TRAM_CSSD';


-- ----------------------------------------------------
-- 5. Establish clean Constraints pointing directly to dm_lookup_value
-- ----------------------------------------------------
ALTER TABLE public.dm_khoa_phong
  ADD CONSTRAINT dm_khoa_phong_khoi_id_fkey FOREIGN KEY (khoi_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_quy_trinh
  ADD CONSTRAINT fact_quy_trinh_vi_tri_kho_id_fkey FOREIGN KEY (vi_tri_kho_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_quy_trinh
  ADD CONSTRAINT fk_quy_trinh_tram_hien_tai FOREIGN KEY (tram_hien_tai_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ----------------------------------------------------
-- 6. Add Comments for clarity and documentation
-- ----------------------------------------------------
COMMENT ON VIEW public.dm_khoi_khoa IS 'View tương thích ngược cho Khối khoa, trỏ sang dm_lookup_value (KHOI_KHOA).';
COMMENT ON VIEW public.dm_vi_tri_kho IS 'View tương thích ngược cho Vị trí lưu kho, trỏ sang dm_lookup_value (VI_TRI_KHO).';
COMMENT ON VIEW public.dm_tram_cssd IS 'View tương thích ngược cho Trạm workflow CSSD, trỏ sang dm_lookup_value (TRAM_CSSD).';
