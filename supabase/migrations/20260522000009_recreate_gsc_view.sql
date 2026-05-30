-- Migration: 20260522000009_recreate_gsc_view.sql
-- Description: Tái tạo lại view v_fact_giam_sat_chung_sessions_full sau khi chuyển cột sang metadata jsonb
-- Date: 22/05/2026

BEGIN;

DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.bang_kiem_id,
    bk.ma_bk AS loai_bang_kiem,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.is_giam_sat_ca_nhan,
    s.nhan_vien_id,
    s.nghe_nghiep_id,
    s.ngay_giam_sat,
    s.thoi_gian_ghi_nhan,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.tong_diem,
    s.ghi_chu_chung,
    COALESCE((s.metadata->>'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien,
    s.metadata->>'ten_manual_nhan_vien' AS ten_manual_nhan_vien,
    COALESCE((s.metadata->>'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
    s.metadata->>'ma_nguoi_benh' AS ma_nguoi_benh,
    s.metadata->>'ten_nguoi_benh' AS ten_nguoi_benh,
    s.metadata->>'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    s.results_jsonb,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    ns_gs.ma_nv AS ma_nguoi_giam_sat,
    ns_nv.ho_ten AS ten_nhan_vien,
    ns_nv.ma_nv AS ma_nhan_vien,
    nn.ma_nghe_nghiep,
    nn.ten_nghe_nghiep,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
   FROM ((((((((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.mdm_nhan_su ns_nv ON ((ns_nv.id = s.nhan_vien_id)))
     LEFT JOIN public.dm_nghe_nghiep nn ON ((nn.id = s.nghe_nghiep_id)))
     LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
  WHERE (COALESCE(s.is_active, true) = true);

GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;

COMMIT;
