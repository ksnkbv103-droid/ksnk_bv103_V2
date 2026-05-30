-- Migration: 20260523000000_nkbv_ma_benh_pham_and_patient_stays.sql
-- Description: Bổ sung ma_benh_an, ma_benh_pham, và các trường kết cục vào fact_vi_sinh_records và fact_giam_sat_nkbv_ca, tái tạo views

-- 1. Bổ sung các cột vào public.fact_vi_sinh_records
ALTER TABLE public.fact_vi_sinh_records
ADD COLUMN IF NOT EXISTS ma_benh_an text,
ADD COLUMN IF NOT EXISTS ma_benh_pham text;

-- 2. Cấu trúc lại unique index cho LIS vi sinh thô
-- Xóa index cũ dựa trên unique_key của metadata
DROP INDEX IF EXISTS public.idx_vi_sinh_unique_key;

-- Tạo index unique mới dựa trên metadata->>'unique_key'
CREATE UNIQUE INDEX IF NOT EXISTS idx_vi_sinh_unique_key ON public.fact_vi_sinh_records((metadata->>'unique_key')) WHERE is_active = true;

-- 3. Bổ sung các cột vào public.fact_giam_sat_nkbv_ca
ALTER TABLE public.fact_giam_sat_nkbv_ca
ADD COLUMN IF NOT EXISTS ma_benh_an text,
ADD COLUMN IF NOT EXISTS ma_benh_pham text,
ADD COLUMN IF NOT EXISTS ngay_ra_vien date,
ADD COLUMN IF NOT EXISTS ket_cuc_dieu_tri text,
ADD COLUMN IF NOT EXISTS ly_do_tu_vong text,
ADD COLUMN IF NOT EXISTS tu_vong_lien_quan_nkbv boolean;

-- 4. Tái tạo View public.v_fact_giam_sat_nkbv_ca_full bao gồm cả các cột mới
DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_nkbv_ca_full AS
 SELECT c.id,
    c.ma_ca,
    c.khoa_ghi_nhan_id,
    c.ma_benh_nhan,
    c.ho_ten_benh_nhan,
    c.ngay_sinh,
    c.gioi_tinh,
    c.ngay_vao_vien,
    c.ngay_phat_hien,
    c.vi_tri_nhiem_khuan,
    c.tac_nhan_vi_khuan,
    c.clinical_notes->>'tom_tat_dien_bien' AS tom_tat_dien_bien,
    c.clinical_notes->>'bien_phap_phong_ngua' AS bien_phap_phong_ngua,
    c.loai_nkbv_id,
    c.trang_thai_id,
    c.clinical_notes->>'ly_do_loai_tru' AS ly_do_loai_tru,
    c.nguoi_ghi_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.clinical_notes,
    c.vi_sinh_record_id,
    c.verification_data,
    c.ma_benh_an,           -- Bổ sung
    c.ma_benh_pham,         -- Bổ sung
    c.ngay_ra_vien,         -- Bổ sung
    c.ket_cuc_dieu_tri,     -- Bổ sung
    c.ly_do_tu_vong,        -- Bổ sung
    c.tu_vong_lien_quan_nkbv, -- Bổ sung
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM (((public.fact_giam_sat_nkbv_ca c
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.dm_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN public.dm_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));
