-- Migration: Recreate cascaded views v_dm_khoa_phong_full and v_fact_quy_trinh_full
-- Date: 22/05/2026

-- Recreate v_dm_khoa_phong_full
CREATE OR REPLACE VIEW public.v_dm_khoa_phong_full WITH (security_invoker='true') AS
 SELECT kp.id,
    kp.ma_khoa,
    kp.ten_khoa,
    kp.khoi_id,
    kk.ma_khoi,
    kk.ten_khoi,
    kp.mo_ta_chuc_nang,
    kp.so_bac_si,
    kp.so_dieu_duong,
    kp.so_giuong_benh_thuong,
    kp.so_giuong_cap_cuu,
    kp.is_active,
    kp.created_at,
    kp.updated_at
   FROM (public.dm_khoa_phong kp
     LEFT JOIN public.dm_khoi_khoa kk ON ((kk.id = kp.khoi_id)));

COMMENT ON VIEW public.v_dm_khoa_phong_full IS 'Khoa phòng + tên khối (đọc). FK khoi_id vẫn trên dm_khoa_phong; INSERT/UPDATE dùng bảng gốc.';

-- Recreate v_fact_quy_trinh_full
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
    l.ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((public.fact_quy_trinh q
     LEFT JOIN public.dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN public.dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN public.dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));

COMMENT ON VIEW public.v_fact_quy_trinh_full IS 'CSSD quy trình đọc: tram_hien_tai_id + alias ma_trang_thai_hien_tai từ dm_tram_cssd.';
