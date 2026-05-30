-- Migration: Restore dm_loai_dung_cu as an independent physical table and update constraints/views
-- Date: 20/05/2026

-- ----------------------------------------------------
-- 1. Drop temporary backward-compatible SQL View dm_loai_dung_cu and related views (using CASCADE to handle dependencies)
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.dm_loai_dung_cu CASCADE;

-- ----------------------------------------------------
-- 2. Drop lookup-based foreign keys
-- ----------------------------------------------------
ALTER TABLE public.dm_bo_dung_cu_chi_tiet DROP CONSTRAINT IF EXISTS dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey;
ALTER TABLE public.dm_bo_dung_cu DROP CONSTRAINT IF EXISTS dm_bo_dung_cu_loai_dung_cu_id_fkey;

-- ----------------------------------------------------
-- 3. Create independent physical table public.dm_loai_dung_cu
-- ----------------------------------------------------
CREATE TABLE public.dm_loai_dung_cu (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ma_loai character varying(50) NOT NULL,
    ten_loai text NOT NULL,
    mo_ta text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    ma_loai_dung_cu text,
    ten_loai_dung_cu text,
    hinh_dang text,
    kich_thuoc text,
    cong_dung text,
    kha_nang_chiu_nhiet text,
    phuong_phap_tiet_khuan text,
    legacy_danh_muc_id uuid,
    so_ngay_han_dung integer DEFAULT 30
);

-- Optimize indices
CREATE INDEX IF NOT EXISTS idx_dm_loai_dung_cu_active ON public.dm_loai_dung_cu(is_active) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_dm_loai_dung_cu_code ON public.dm_loai_dung_cu(ma_loai_dung_cu);

-- ----------------------------------------------------
-- 4. Migrate data BACK from dm_lookup_value
-- ----------------------------------------------------
INSERT INTO public.dm_loai_dung_cu (
  id,
  ma_loai,
  ten_loai,
  mo_ta,
  created_at,
  updated_at,
  is_active,
  ma_loai_dung_cu,
  ten_loai_dung_cu,
  hinh_dang,
  kich_thuoc,
  cong_dung,
  kha_nang_chiu_nhiet,
  phuong_phap_tiet_khuan,
  so_ngay_han_dung
)
SELECT 
  id,
  code AS ma_loai,
  name AS ten_loai,
  description AS mo_ta,
  created_at,
  updated_at,
  is_active,
  code AS ma_loai_dung_cu,
  name AS ten_loai_dung_cu,
  (metadata->>'hinh_dang') AS hinh_dang,
  (metadata->>'kich_thuoc') AS kich_thuoc,
  (metadata->>'cong_dung') AS cong_dung,
  (metadata->>'kha_nang_chiu_nhiet') AS kha_nang_chiu_nhiet,
  (metadata->>'phuong_phap_tiet_khuan') AS phuong_phap_tiet_khuan,
  COALESCE((metadata->>'so_ngay_han_dung')::integer, 30) AS so_ngay_han_dung
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_DUNG_CU'
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------
-- 5. Clean up gộp table dm_lookup_value
-- ----------------------------------------------------
DELETE FROM public.dm_lookup_value WHERE category_type = 'LOAI_DUNG_CU';

-- ----------------------------------------------------
-- 6. Establish Foreign Keys pointing to the restored physical table dm_loai_dung_cu
-- ----------------------------------------------------
ALTER TABLE public.dm_bo_dung_cu_chi_tiet
  ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.dm_bo_dung_cu
  ADD CONSTRAINT dm_bo_dung_cu_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_loai_dung_cu(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ----------------------------------------------------
-- 7. Recreate SQL Views joining directly to dm_loai_dung_cu
-- ----------------------------------------------------

-- v_dm_bo_dung_cu_chi_tiet_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full WITH (security_invoker='true') AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai_dung_cu AS ma_loai_dung_cu,
    l.ten_loai_dung_cu AS ten_loai_dung_cu,
    c.ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.ma_qr_mau,
    c.is_active,
    c.created_at,
    c.updated_at
   FROM ((public.dm_bo_dung_cu_chi_tiet c
     LEFT JOIN public.dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN public.dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));

-- v_dm_bo_dung_cu_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full WITH (security_invoker='true') AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    l.ma_loai_dung_cu AS ma_loai_dung_cu,
    l.ten_loai_dung_cu AS ten_loai_dung_cu,
    b.khoa_su_dung_id,
    k.ma_khoa AS ma_khoa_su_dung,
    k.ten_khoa AS ten_khoa_su_dung,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at
   FROM ((public.dm_bo_dung_cu b
     LEFT JOIN public.dm_loai_dung_cu l ON ((l.id = b.loai_dung_cu_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = b.khoa_su_dung_id)));

-- v_fact_quy_trinh_full
CREATE OR REPLACE VIEW public.v_fact_quy_trinh_full WITH (security_invoker='true') AS
 SELECT q.id,
    q.ma_qr_quy_trinh,
    q.bo_dung_cu_id,
    q.tram_hien_tai_id,
    t.ma_tram AS ma_trang_thai_hien_tai,
    t.ten_tram AS ten_tram_hien_tai,
    q.nguoi_dang_giu_id,
    q.nguoi_tiep_nhan_id,
    q.nguoi_lam_sach_id,
    q.nguoi_kiem_tra_id,
    q.nguoi_dong_goi_id,
    q.nguoi_tiet_khuan_id,
    q.nguoi_cap_phat_id,
    q.thoi_gian_tiep_nhan,
    q.thoi_gian_lam_sach,
    q.thoi_gian_qc,
    q.thoi_gian_dong_goi,
    q.thoi_gian_tiet_khuan,
    q.thoi_gian_cap_phat,
    q.lo_tiet_khuan_id,
    q.suds_count,
    q.ngay_tiet_khuan,
    q.han_su_dung,
    q.tinh_trang,
    q.is_dong_bang,
    q.quy_trinh_cha_id,
    q.ma_vai_tro_bo,
    q.ma_ca_mo_id,
    q.vi_tri_kho_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.ten_loai_dung_cu AS ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((public.fact_quy_trinh q
     LEFT JOIN public.dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN public.dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN public.dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));

-- Set comments
COMMENT ON TABLE public.dm_loai_dung_cu IS 'Bảng danh mục vật lý độc lập quản lý phân loại dụng cụ y tế CSSD (Phẫu thuật, Nội soi, v.v.).';
COMMENT ON VIEW public.v_dm_bo_dung_cu_chi_tiet_full IS 'View chi tiết bộ dụng cụ đầy đủ thông tin loại dụng cụ từ bảng vật lý dm_loai_dung_cu.';
COMMENT ON VIEW public.v_dm_bo_dung_cu_full IS 'View bộ dụng cụ đầy đủ thông tin khoa phòng và loại dụng cụ vật lý.';
COMMENT ON VIEW public.v_fact_quy_trinh_full IS 'View quy trình CSSD đầy đủ thông tin trạm, bộ dụng cụ, khoa phòng và loại dụng cụ vật lý.';
