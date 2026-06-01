-- View compat `fact_cong_viec_dinh_ky` thiếu cột sau 20260530150000 → app không SELECT được mẫu

CREATE OR REPLACE VIEW public.fact_cong_viec_dinh_ky WITH (security_invoker = true) AS
 SELECT
    id,
    tieu_de,
    mo_ta,
    ma_chu_ky,
    ngay_bat_dau,
    nguoi_phu_trach_id,
    to_cong_tac_id,
    nguoi_tao_id,
    is_active,
    created_at,
    updated_at,
    muc_do_uu_tien,
    khoa_thuc_hien_id
   FROM public.qlcv_fact_cong_viec_dinh_ky;

NOTIFY pgrst, 'reload schema';
