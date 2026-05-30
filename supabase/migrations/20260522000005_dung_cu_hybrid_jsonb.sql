-- MIGRATION: 20260522000005_dung_cu_hybrid_jsonb.sql
-- DESCRIPTION: Chuyển đổi các cột thông số phụ của dm_loai_dung_cu và dm_bo_dung_cu_chi_tiet sang specs jsonb

BEGIN;

-------------------------------------------------------------------------------
-- 1. Xử lý bảng dm_loai_dung_cu
-------------------------------------------------------------------------------

-- 1.1 Thêm cột specs
ALTER TABLE public.dm_loai_dung_cu 
ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb;

-- 1.2 Migrate dữ liệu vào cột specs
UPDATE public.dm_loai_dung_cu
SET specs = jsonb_build_object(
    'hinh_dang', hinh_dang,
    'kich_thuoc', kich_thuoc,
    'cong_dung', cong_dung,
    'kha_nang_chiu_nhiet', kha_nang_chiu_nhiet,
    'phuong_phap_tiet_khuan', phuong_phap_tiet_khuan
)
WHERE hinh_dang IS NOT NULL 
   OR kich_thuoc IS NOT NULL 
   OR cong_dung IS NOT NULL 
   OR kha_nang_chiu_nhiet IS NOT NULL 
   OR phuong_phap_tiet_khuan IS NOT NULL;

-- 1.3 Dọn dẹp các key có giá trị null trong JSONB
UPDATE public.dm_loai_dung_cu
SET specs = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(specs)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
)
WHERE specs != '{}'::jsonb;

-- 1.3.1 Xử lý View bị ảnh hưởng
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;

-- 1.4 Xóa các cột phẳng đã migrate
ALTER TABLE public.dm_loai_dung_cu 
DROP COLUMN IF EXISTS hinh_dang,
DROP COLUMN IF EXISTS kich_thuoc,
DROP COLUMN IF EXISTS cong_dung,
DROP COLUMN IF EXISTS kha_nang_chiu_nhiet,
DROP COLUMN IF EXISTS phuong_phap_tiet_khuan;

-- 1.5 Tạo lại View
CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
 SELECT l.id,
    l.ma_loai,
    l.ten_loai,
    l.mo_ta,
    l.created_at,
    l.updated_at,
    l.is_active,
    l.ma_loai_dung_cu,
    l.ten_loai_dung_cu,
    l.specs->>'hinh_dang' AS hinh_dang,
    l.specs->>'kich_thuoc' AS kich_thuoc,
    l.specs->>'cong_dung' AS cong_dung,
    l.specs->>'kha_nang_chiu_nhiet' AS kha_nang_chiu_nhiet,
    l.specs->>'phuong_phap_tiet_khuan' AS phuong_phap_tiet_khuan,
    l.legacy_danh_muc_id,
    l.so_ngay_han_dung,
    l.phan_loai,
    l.so_luong_kho_du_phong,
    (COALESCE(l.so_luong_kho_du_phong, 0) + (COALESCE(sum(
        CASE
            WHEN ((b.is_active = true) AND (c.is_active = true)) THEN c.so_luong
            ELSE 0
        END), (0)::bigint))::integer) AS so_luong_tong,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo)) FILTER (WHERE ((b.id IS NOT NULL) AND (b.is_active = true) AND (c.is_active = true))), '[]'::jsonb) AS bo_dung_cu_chua
   FROM ((dm_loai_dung_cu l
     LEFT JOIN dm_bo_dung_cu_chi_tiet c ON ((c.loai_dung_cu_id = l.id)))
     LEFT JOIN dm_bo_dung_cu b ON ((c.bo_dung_cu_id = b.id)))
  GROUP BY l.id;


-------------------------------------------------------------------------------
-- 2. Xử lý bảng dm_bo_dung_cu_chi_tiet
-------------------------------------------------------------------------------

-- 2.1 Thêm cột specs
ALTER TABLE public.dm_bo_dung_cu_chi_tiet 
ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb;

-- 2.2 Migrate dữ liệu vào cột specs
UPDATE public.dm_bo_dung_cu_chi_tiet
SET specs = jsonb_build_object(
    'max_suds_count', max_suds_count,
    'trong_luong', trong_luong,
    'ma_qr_mau', ma_qr_mau,
    'ma_chi_tiet', ma_chi_tiet
)
WHERE max_suds_count IS NOT NULL 
   OR trong_luong IS NOT NULL 
   OR ma_qr_mau IS NOT NULL 
   OR ma_chi_tiet IS NOT NULL;

-- 2.3 Dọn dẹp các key null
UPDATE public.dm_bo_dung_cu_chi_tiet
SET specs = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(specs)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
)
WHERE specs != '{}'::jsonb;

-- 2.3.1 Xử lý View bị ảnh hưởng
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;

-- 2.4 Xóa các cột phẳng đã migrate
ALTER TABLE public.dm_bo_dung_cu_chi_tiet 
DROP COLUMN IF EXISTS max_suds_count,
DROP COLUMN IF EXISTS trong_luong,
DROP COLUMN IF EXISTS ma_qr_mau,
DROP COLUMN IF EXISTS ma_chi_tiet;

-- 2.5 Tạo lại View
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai_dung_cu,
    l.ten_loai_dung_cu,
    c.specs->>'ma_chi_tiet' AS ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.specs->>'ma_qr_mau' AS ma_qr_mau,
    c.is_active,
    c.created_at,
    c.updated_at
   FROM ((dm_bo_dung_cu_chi_tiet c
     LEFT JOIN dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));

-- 2.6 Xóa nội dung trong cột ghi_chu (theo yêu cầu giữ lại cột nhưng xóa dữ liệu)
UPDATE public.dm_bo_dung_cu_chi_tiet SET ghi_chu = NULL;
UPDATE public.dm_bo_dung_cu SET ghi_chu = NULL;

COMMIT;
