-- Đồng bộ view dm_bang_kiem / v_gstt_bang_kiem_full với cột ap_dung_jsonb (Wave A BK áp dụng).

BEGIN;

CREATE OR REPLACE VIEW public.dm_bang_kiem WITH (security_invoker = true) AS
 SELECT id,
    ma_bk,
    ten_bang_kiem,
    mo_ta,
    is_active,
    is_system,
    created_at,
    updated_at,
    loai_hinh_giam_sat,
    tieu_chi_jsonb,
    phan_loai_chuyen_mon,
    loai_giam_sat,
    doi_tuong_giam_sat,
    cach_tinh_diem,
    phien_ban,
    ap_dung_jsonb
   FROM public.gstt_dm_bang_kiem;

CREATE OR REPLACE VIEW public.v_gstt_bang_kiem_full WITH (security_invoker = true) AS
 SELECT id,
    ma_bk,
    ten_bang_kiem,
    mo_ta,
    loai_hinh_giam_sat,
    is_active,
    is_system,
    created_at,
    updated_at,
    phan_loai_chuyen_mon,
    ap_dung_jsonb
   FROM public.gstt_dm_bang_kiem;

COMMIT;
