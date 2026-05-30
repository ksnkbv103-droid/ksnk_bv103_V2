-- Migration: 20260524000001_nkbv_symptom_iwp_and_rit_rule.sql
-- Description: Bổ sung trường định lượng so_luong và loại bệnh phẩm loai_benh_pham vào các bảng vật lý và cập nhật view.

-- 1. Thêm cột so_luong vào fact_nkbv_vi_sinh nếu chưa tồn tại
ALTER TABLE public.fact_nkbv_vi_sinh ADD COLUMN IF NOT EXISTS so_luong text;

-- 2. Thêm các cột loai_benh_pham và so_luong vào fact_nkbv_su_kien nếu chưa tồn tại
ALTER TABLE public.fact_nkbv_su_kien ADD COLUMN IF NOT EXISTS loai_benh_pham text;
ALTER TABLE public.fact_nkbv_su_kien ADD COLUMN IF NOT EXISTS so_luong text;

-- 3. Tái tạo view v_fact_nkbv_su_kien_full để hỗ trợ hiển thị loai_benh_pham và so_luong từ bảng sự kiện
DROP VIEW IF EXISTS public.v_fact_nkbv_su_kien_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_nkbv_su_kien_full AS
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
    c.ma_benh_an,
    c.ma_benh_pham,
    c.loai_benh_pham,
    c.so_luong,
    s.ngay_ra_vien,
    s.ket_cuc_dieu_tri,
    s.ly_do_tu_vong,
    s.tu_vong_lien_quan_nkbv,
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM ((((public.fact_nkbv_su_kien c
     LEFT JOIN public.fact_nkbv_benh_an s ON ((s.ma_benh_an = c.ma_benh_an)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.dm_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN public.dm_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));
