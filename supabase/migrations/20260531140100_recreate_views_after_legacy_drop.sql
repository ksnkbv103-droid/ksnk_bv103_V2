-- Khôi phục view bị CASCADE khi DROP dm_khoi_khoa / cssd_dm_loai_may (20260531140000).

BEGIN;

CREATE OR REPLACE VIEW public.v_cssd_thiet_bi_full WITH (security_invoker = true) AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_may_hien_thi,
    lm.ma_loai_may AS loai_thiet_bi,
    tb.trang_thai,
    (tb.specs ->> 'hang_san_xuat'::text) AS hang_san_xuat,
    ((tb.specs ->> 'nam_san_xuat'::text))::integer AS nam_san_xuat,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    (tb.specs ->> 'ghi_chu'::text) AS ghi_chu,
    tb.specs,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM public.cssd_dm_thiet_bi tb
     LEFT JOIN public.cssd_dm_loai_may lm ON lm.id = tb.loai_may_id;

CREATE OR REPLACE VIEW public.v_mdm_khoa_phong_full WITH (security_invoker = true) AS
 SELECT kp.id,
    kp.ma_khoa,
    kp.ten_khoa,
    kp.khoi_id,
    kk.ma_khoi,
    kk.ten_khoi,
    (kp.specs ->> 'mo_ta_chuc_nang'::text) AS mo_ta_chuc_nang,
    ((kp.specs ->> 'so_bac_si'::text))::integer AS so_bac_si,
    ((kp.specs ->> 'so_dieu_duong'::text))::integer AS so_dieu_duong,
    ((kp.specs ->> 'so_giuong_benh_thuong'::text))::integer AS so_giuong_benh_thuong,
    ((kp.specs ->> 'so_giuong_cap_cuu'::text))::integer AS so_giuong_cap_cuu,
    kp.is_active,
    kp.created_at,
    kp.updated_at,
    kp.specs
   FROM public.mdm_dm_khoa_phong kp
     LEFT JOIN public.mdm_dm_khoi_khoa kk ON kk.id = kp.khoi_id;

CREATE OR REPLACE VIEW public.v_dm_khoa_phong_full WITH (security_invoker = true) AS
 SELECT id,
    ma_khoa,
    ten_khoa,
    khoi_id,
    ma_khoi,
    ten_khoi,
    mo_ta_chuc_nang,
    so_bac_si,
    so_dieu_duong,
    so_giuong_benh_thuong,
    so_giuong_cap_cuu,
    is_active,
    created_at,
    updated_at,
    specs
   FROM public.v_mdm_khoa_phong_full;

CREATE OR REPLACE VIEW public.v_dm_thiet_bi_full WITH (security_invoker = true) AS
 SELECT id,
    ma_thiet_bi,
    ten_thiet_bi,
    loai_may_id,
    ma_loai_may,
    ten_loai_may_hien_thi,
    loai_thiet_bi,
    trang_thai,
    hang_san_xuat,
    nam_san_xuat,
    ngay_dua_vao_su_dung,
    chu_ky_bao_tri_ngay,
    ngay_bao_tri_gan_nhat,
    ngay_bao_tri_tiep_theo,
    ghi_chu,
    specs,
    is_active,
    created_at,
    updated_at
   FROM public.v_cssd_thiet_bi_full;

COMMIT;
