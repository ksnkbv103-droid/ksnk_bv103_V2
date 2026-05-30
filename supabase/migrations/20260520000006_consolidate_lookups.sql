-- Migration: Consolidate 11 fragmented lookup tables into a unified dm_lookup_value table
-- Date: 20/05/2026

CREATE TABLE IF NOT EXISTS public.dm_lookup_value (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_type text NOT NULL, -- E.g. 'NGHE_NGHIEP', 'CHUC_DANH', 'LOAI_DUNG_CU', etc.
    code text NOT NULL,          -- E.g. 'BAC_SI', 'DD_TRUONG', 'KEO_HAU', etc.
    name text NOT NULL,          -- E.g. 'Bác sĩ', 'Điều dưỡng trưởng', 'Kéo phẫu thuật', etc.
    description text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb,              -- E.g. { "so_ngay_han_dung": 30, "kha_nang_chiu_nhiet": "Có" }
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT uq_category_type_code UNIQUE (category_type, code)
);

-- Optimize indices for category lookups
CREATE INDEX IF NOT EXISTS idx_dm_lookup_value_type ON public.dm_lookup_value(category_type) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_dm_lookup_value_code ON public.dm_lookup_value(category_type, code);

-- ----------------------------------------------------
-- Data Migration from 11 legacy lookup tables
-- ----------------------------------------------------

-- 1. dm_nghe_nghiep
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'NGHE_NGHIEP', 
  ma_nghe_nghiep, 
  ten_nghe_nghiep, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_nghe_nghiep
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 2. dm_chuc_danh
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'CHUC_DANH', 
  ma_chuc_danh, 
  ten_chuc_danh, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_chuc_danh
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 3. dm_chuc_vu
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'CHUC_VU', 
  ma_chuc_vu, 
  ten_chuc_vu, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_chuc_vu
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 4. dm_cach_thuc_giam_sat
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'CACH_THUC_GIAM_SAT', 
  ma_cach_thuc, 
  ten_cach_thuc, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_cach_thuc_giam_sat
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 5. dm_hinh_thuc_giam_sat
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'HINH_THUC_GIAM_SAT', 
  ma_hinh_thuc, 
  ten_hinh_thuc, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_hinh_thuc_giam_sat
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 6. dm_to_cong_tac
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'TO_CONG_TAC', 
  ma_to, 
  ten_to, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_to_cong_tac
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 7. dm_loai_dung_cu (With dynamic jsonb metadata properties)
INSERT INTO public.dm_lookup_value (id, category_type, code, name, description, is_active, metadata, created_at, updated_at)
SELECT 
  id, 
  'LOAI_DUNG_CU', 
  ma_loai, 
  ten_loai, 
  mo_ta,
  coalesce(is_active, true), 
  jsonb_build_object(
    'kha_nang_chiu_nhiet', kha_nang_chiu_nhiet,
    'phuong_phap_tiet_khuan', phuong_phap_tiet_khuan,
    'so_ngay_han_dung', coalesce(so_ngay_han_dung, 30),
    'kich_thuoc', kich_thuoc,
    'hinh_dang', hinh_dang,
    'cong_dung', cong_dung
  ),
  coalesce(created_at, now()), 
  coalesce(updated_at, now())
FROM public.dm_loai_dung_cu
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active, metadata = EXCLUDED.metadata;

-- 8. dm_loai_may_tiet_khuan
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'LOAI_MAY_TIET_KHUAN', 
  ma_loai_may, 
  ten_loai_may, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_loai_may_tiet_khuan
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 9. dm_loai_nkbv
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'LOAI_NKBV', 
  ma_loai, 
  ten_loai, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_loai_nkbv
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 10. dm_loai_su_co
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'LOAI_SU_CO', 
  ma_loai_su_co, 
  ten_loai_su_co, 
  is_active, 
  created_at, 
  updated_at
FROM public.dm_loai_su_co
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 11. dm_loai_cong_viec
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, created_at, updated_at)
SELECT 
  id, 
  'LOAI_CONG_VIEC', 
  ma, 
  ten, 
  true as is_active, 
  now() as created_at, 
  now() as updated_at
FROM public.dm_loai_cong_viec
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

COMMENT ON TABLE public.dm_lookup_value IS 'Bảng danh mục lookup hợp nhất từ 11 bảng danh mục phụ để chuẩn hóa tinh gọn DB KSNK BV103.';

