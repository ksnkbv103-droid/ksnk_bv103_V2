-- MIGRATION: 20260522000008_cleanup_yellow_flags.sql
-- DESCRIPTION: Xử lý các cột cảnh báo 'Màu vàng' từ báo cáo
-- Cụ thể:
-- 1. dm_loai_dung_cu: Chuyển ma_loai_dung_cu, ten_loai_dung_cu -> specs (trùng lặp với ma_loai, ten_loai)
-- 2. dm_bo_dung_cu_chi_tiet: DROP ma_loai (có thể JOIN từ dm_loai_dung_cu)
-- 3. fact_giam_sat_vst: Chuyển ten_nhan_vien_ngoai -> metadata jsonb
-- 4. fact_su_co: Chuyển incident_group, incident_type_label -> attributes jsonb
-- 5. fact_quy_trinh: Chuyển ma_ca_mo_id -> metadata jsonb

BEGIN;

-- =============================================================================
-- 1. dm_loai_dung_cu: ma_loai_dung_cu, ten_loai_dung_cu -> specs
-- =============================================================================

UPDATE public.dm_loai_dung_cu
SET specs = COALESCE(specs, '{}'::jsonb) || jsonb_build_object(
    'ma_loai_dung_cu', ma_loai_dung_cu,
    'ten_loai_dung_cu', ten_loai_dung_cu
)
WHERE ma_loai_dung_cu IS NOT NULL OR ten_loai_dung_cu IS NOT NULL;

-- Drop views
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_su_co_full CASCADE;

ALTER TABLE public.dm_loai_dung_cu
DROP COLUMN IF EXISTS ma_loai_dung_cu,
DROP COLUMN IF EXISTS ten_loai_dung_cu;

-- Recreate view
CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
 SELECT l.id,
    l.ma_loai,
    l.ten_loai,
    l.mo_ta,
    l.created_at,
    l.updated_at,
    l.is_active,
    l.specs->>'ma_loai_dung_cu' AS ma_loai_dung_cu,
    l.specs->>'ten_loai_dung_cu' AS ten_loai_dung_cu,
    (l.specs ->> 'hinh_dang'::text) AS hinh_dang,
    (l.specs ->> 'kich_thuoc'::text) AS kich_thuoc,
    (l.specs ->> 'cong_dung'::text) AS cong_dung,
    (l.specs ->> 'kha_nang_chiu_nhiet'::text) AS kha_nang_chiu_nhiet,
    (l.specs ->> 'phuong_phap_tiet_khuan'::text) AS phuong_phap_tiet_khuan,
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


-- =============================================================================
-- 2. dm_bo_dung_cu_chi_tiet: DROP ma_loai
-- =============================================================================

ALTER TABLE public.dm_bo_dung_cu_chi_tiet
DROP COLUMN IF EXISTS ma_loai;

-- Recreate v_dm_bo_dung_cu_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu,
    l.ten_loai AS ten_loai_dung_cu,
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
   FROM ((dm_bo_dung_cu b
     LEFT JOIN dm_loai_dung_cu l ON ((l.id = b.loai_dung_cu_id)))
     LEFT JOIN dm_khoa_phong k ON ((k.id = b.khoa_su_dung_id)));

-- Recreate v_dm_bo_dung_cu_chi_tiet_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai AS ma_loai_dung_cu, -- Lấy từ bảng cha thay vì c.ma_loai
    l.ten_loai AS ten_loai_dung_cu,
    c.specs->>'ma_chi_tiet' AS ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.specs->>'ma_qr_mau' AS ma_qr_mau,
    (c.specs->>'co_ma_khac')::boolean AS co_ma_khac,
    c.specs->>'ma_khac' AS ma_khac,
    c.is_active,
    c.ghi_chu,
    c.created_at,
    c.updated_at,
    c.specs
   FROM ((dm_bo_dung_cu_chi_tiet c
     LEFT JOIN dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN dm_loai_dung_cu l ON ((l.id = c.loai_dung_cu_id)));


-- =============================================================================
-- 3. fact_giam_sat_vst: ten_nhan_vien_ngoai -> metadata jsonb
-- =============================================================================

ALTER TABLE public.fact_giam_sat_vst
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE public.fact_giam_sat_vst
SET metadata = jsonb_build_object('ten_nhan_vien_ngoai', ten_nhan_vien_ngoai)
WHERE ten_nhan_vien_ngoai IS NOT NULL;

DROP VIEW IF EXISTS public.vw_vst_hotpath CASCADE;

ALTER TABLE public.fact_giam_sat_vst
DROP COLUMN IF EXISTS ten_nhan_vien_ngoai;

CREATE OR REPLACE VIEW public.vw_vst_hotpath AS
 SELECT id,
    session_id,
    nhan_vien_id,
    metadata->>'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai,
    khoa_id,
    vi_tri,
    ngay_giam_sat,
    thoi_diem,
    hanh_dong,
    dung_ky_thuat,
    du_thoi_gian,
    co_deo_gang,
    thoi_gian_ghi_nhan,
    created_at,
    ghi_chu,
    khu_vuc_id,
    nghe_nghiep_id
   FROM fact_giam_sat_vst;


-- =============================================================================
-- 4. fact_su_co: incident_group, incident_type_label -> attributes jsonb
-- =============================================================================

UPDATE public.fact_su_co
SET attributes = COALESCE(attributes, '{}'::jsonb) || jsonb_build_object(
    'incident_group', incident_group,
    'incident_type_label', incident_type_label
)
WHERE incident_group IS NOT NULL OR incident_type_label IS NOT NULL;

ALTER TABLE public.fact_su_co
DROP COLUMN IF EXISTS incident_group,
DROP COLUMN IF EXISTS incident_type_label;

CREATE OR REPLACE VIEW public.v_fact_su_co_full AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.name AS ten_loai_su_co,
    sc.attributes->>'incident_group' AS incident_group,
    sc.attributes->>'incident_type_label' AS incident_type_label,
    COALESCE(NULLIF(concat(sc.attributes->>'incident_group', ':', sc.attributes->>'incident_type_label'), ':'::text), ls.code) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at,
    sc.attributes
   FROM (fact_su_co sc
     LEFT JOIN dm_lookup_value ls ON (((ls.id = sc.loai_su_co_id) AND (ls.category_type = 'LOAI_SU_CO'::text))));


-- =============================================================================
-- 5. fact_quy_trinh: ma_ca_mo_id -> metadata jsonb
-- =============================================================================

ALTER TABLE public.fact_quy_trinh
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE public.fact_quy_trinh
SET metadata = jsonb_build_object('ma_ca_mo_id', ma_ca_mo_id)
WHERE ma_ca_mo_id IS NOT NULL;

DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;

ALTER TABLE public.fact_quy_trinh
DROP COLUMN IF EXISTS ma_ca_mo_id;

CREATE OR REPLACE VIEW public.v_fact_quy_trinh_full AS
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
    q.metadata->>'ma_ca_mo_id' AS ma_ca_mo_id,
    q.vi_tri_kho_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.ten_loai AS ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((fact_quy_trinh q
     LEFT JOIN dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN dm_loai_dung_cu l ON ((b.loai_dung_cu_id = l.id)));

COMMIT;
