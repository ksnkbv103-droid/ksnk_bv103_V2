-- Migration: Recreate missing VST and GSC dashboard views after schema cleanup column drops
-- Date: 22/05/2026

-- 1. Drop existing/legacy definitions with CASCADE
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;

-- 2. Recreate v_fact_giam_sat_vst_full (unpacking ten_nhan_vien_ngoai from metadata and excluding legacy_csv_row_id which was dropped)
CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id,
    o.session_id,
    o.nhan_vien_id,
    o.metadata->>'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai,
    o.khoa_id,
    o.khu_vuc_id,
    o.nghe_nghiep_id,
    o.vi_tri,
    o.ngay_giam_sat,
    o.thoi_diem,
    o.hanh_dong,
    o.dung_ky_thuat,
    o.du_thoi_gian,
    o.co_deo_gang,
    o.thoi_gian_ghi_nhan,
    o.ghi_chu,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
    COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
    nn.ma_nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
    k.ten_khoa AS ten_khoa_phong,
    o.created_at
   FROM (((public.fact_giam_sat_vst o
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = o.khu_vuc_id)))
     LEFT JOIN public.dm_nghe_nghiep nn ON ((nn.id = o.nghe_nghiep_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = o.khoa_id)));

-- 3. Recreate v_fact_giam_sat_vst_sessions_full
CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri_cu_the,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.ngay_giam_sat,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns.ho_ten AS ten_nguoi_giam_sat,
    ns.ma_nv AS ma_nguoi_giam_sat,
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc,
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
    ct.ten_cach_thuc AS cach_thuc_giam_sat,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE (o.session_id = s.id)) AS tong_co_hoi,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE ((o.session_id = s.id) AND ((lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'::text) OR (lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'::text)))) AS da_tuan_thu
   FROM (((((public.fact_giam_sat_vst_sessions s
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns ON ((ns.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ((ht.id = s.hinh_thuc_id)))
     LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ((ct.id = s.cach_thuc_id)))
  WHERE (COALESCE(s.is_active, true) = true);

-- 4. Recreate public.v_gsc_dashboard_rows using lateral join on results_jsonb
CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id,
    s.ngay_giam_sat,
    s.created_at,
    COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem,
    s.tong_diem,
    s.khoa_id,
    kp.ten_khoa,
    (r.elem->>'criterion_id')::uuid AS id,
    (r.elem->>'criterion_id')::uuid AS result_id,
    (r.elem->>'criterion_id')::uuid AS criterion_id,
    r.elem->>'value' AS value,
    r.elem->>'value' AS result_value,
    r.elem->>'note' AS note
   FROM (((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong kp ON ((kp.id = s.khoa_id)))
     LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON true)
  WHERE (s.is_active = true);

-- 5. Grant permissions to authenticated and service_role
GRANT SELECT ON public.v_fact_giam_sat_vst_full TO authenticated, service_role;
GRANT SELECT ON public.v_fact_giam_sat_vst_sessions_full TO authenticated, service_role;
GRANT SELECT ON public.v_gsc_dashboard_rows TO authenticated, service_role;
