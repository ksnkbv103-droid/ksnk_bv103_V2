-- MIGRATION: 20260522000007_comprehensive_schema_cleanup.sql
-- DESCRIPTION: Tổng vệ sinh toàn diện cấu trúc Database KSNK BV103
-- Gồm 4 ưu tiên:
--   1. DROP 8 bảng vật lý dư thừa
--   2. Hybrid JSONB cho dm_khoa_phong
--   3. JSONB cho mdm_nhan_su
--   4. Dọn cột thừa fact_*

BEGIN;

-- =============================================================================
-- ƯU TIÊN 1: DROP 8 BẢNG VẬT LÝ DƯ THỪA
-- =============================================================================

-- 1A. dm_bo_dung_cu_phan_bo (0 dòng, view v_dm_bo_dung_cu_summary phụ thuộc)
-- => Cần DROP view trước, tạo lại view KHÔNG có JOIN phan_bo
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_summary CASCADE;

DROP TABLE IF EXISTS public.dm_bo_dung_cu_phan_bo CASCADE;

-- Tạo lại v_dm_bo_dung_cu_summary KHÔNG có dm_bo_dung_cu_phan_bo
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_summary AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    b.created_at,
    b.updated_at,
    b.is_active,
    b.trang_thai,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.quy_cach,
    b.khoa_su_dung_id,
    b.phan_loai_bo,
    b.co_ma_dinh_danh_rieng,
    (COALESCE(count(DISTINCT q.id) FILTER (WHERE ((q.is_active = true) AND ((q.tinh_trang)::text IS DISTINCT FROM 'MAT'::text))), (0)::bigint))::integer AS so_luong_bo,
    (COALESCE(count(DISTINCT c.id) FILTER (WHERE (c.is_active = true)), (0)::bigint))::integer AS so_khoan,
    (COALESCE(sum(c.so_luong) FILTER (WHERE (c.is_active = true)), (0)::bigint))::integer AS tong_so_luong_dung_cu
   FROM ((dm_bo_dung_cu b
     LEFT JOIN dm_bo_dung_cu_chi_tiet c ON ((c.bo_dung_cu_id = b.id)))
     LEFT JOIN fact_quy_trinh q ON ((q.bo_dung_cu_id = b.id)))
  GROUP BY b.id;

-- 1B. 6 bảng dm_cach_thuc_giam_sat, dm_chuc_danh, dm_chuc_vu,
--     dm_hinh_thuc_giam_sat, dm_loai_cong_viec, dm_nghe_nghiep
--     => Đã được chuyển thành Views ở migration trước. Không cần can thiệp.

-- 1C. dm_loai_may_tiet_khuan (đã là View, FK đã chuyển sang dm_lookup_value)
--     => Chỉ cần xác nhận View đã tồn tại, không cần làm gì thêm.
--     (Dữ liệu đã có sẵn trong dm_lookup_value từ migration trước)




-- =============================================================================
-- ƯU TIÊN 2: HYBRID JSONB CHO dm_khoa_phong
-- =============================================================================

ALTER TABLE public.dm_khoa_phong
ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb;

-- Migrate 5 cột mô tả → specs
UPDATE public.dm_khoa_phong
SET specs = jsonb_build_object(
    'mo_ta_chuc_nang', mo_ta_chuc_nang,
    'so_bac_si', so_bac_si,
    'so_dieu_duong', so_dieu_duong,
    'so_giuong_benh_thuong', so_giuong_benh_thuong,
    'so_giuong_cap_cuu', so_giuong_cap_cuu
)
WHERE mo_ta_chuc_nang IS NOT NULL
   OR so_bac_si IS NOT NULL
   OR so_dieu_duong IS NOT NULL
   OR so_giuong_benh_thuong IS NOT NULL
   OR so_giuong_cap_cuu IS NOT NULL;

-- Dọn null keys
UPDATE public.dm_khoa_phong
SET specs = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(specs)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
)
WHERE specs != '{}'::jsonb;

-- Drop view trước khi xóa cột
DROP VIEW IF EXISTS public.v_dm_khoa_phong_full CASCADE;

ALTER TABLE public.dm_khoa_phong
DROP COLUMN IF EXISTS mo_ta_chuc_nang,
DROP COLUMN IF EXISTS so_bac_si,
DROP COLUMN IF EXISTS so_dieu_duong,
DROP COLUMN IF EXISTS so_giuong_benh_thuong,
DROP COLUMN IF EXISTS so_giuong_cap_cuu;

-- Tạo lại View
CREATE OR REPLACE VIEW public.v_dm_khoa_phong_full AS
 SELECT kp.id,
    kp.ma_khoa,
    kp.ten_khoa,
    kp.khoi_id,
    kk.ma_khoi,
    kk.ten_khoi,
    kp.specs->>'mo_ta_chuc_nang' AS mo_ta_chuc_nang,
    (kp.specs->>'so_bac_si')::integer AS so_bac_si,
    (kp.specs->>'so_dieu_duong')::integer AS so_dieu_duong,
    (kp.specs->>'so_giuong_benh_thuong')::integer AS so_giuong_benh_thuong,
    (kp.specs->>'so_giuong_cap_cuu')::integer AS so_giuong_cap_cuu,
    kp.is_active,
    kp.created_at,
    kp.updated_at,
    kp.specs
   FROM (dm_khoa_phong kp
     LEFT JOIN dm_khoi_khoa kk ON ((kk.id = kp.khoi_id)));


-- =============================================================================
-- ƯU TIÊN 3: JSONB CHO mdm_nhan_su (dùng extra_data đã có sẵn)
-- =============================================================================

-- Migrate 4 cột → extra_data
UPDATE public.mdm_nhan_su
SET extra_data = COALESCE(extra_data, '{}'::jsonb) || jsonb_build_object(
    'ngay_sinh', ngay_sinh,
    'gioi_tinh', gioi_tinh,
    'so_dien_thoai', so_dien_thoai,
    'email', email
)
WHERE ngay_sinh IS NOT NULL
   OR gioi_tinh IS NOT NULL
   OR so_dien_thoai IS NOT NULL
   OR email IS NOT NULL;

-- Dọn null keys trong extra_data
UPDATE public.mdm_nhan_su
SET extra_data = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(extra_data)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
)
WHERE extra_data != '{}'::jsonb;

-- Drop views
DROP VIEW IF EXISTS public.v_mdm_nhan_su_full CASCADE;
DROP VIEW IF EXISTS public.v_auth_user_permissions CASCADE;
DROP VIEW IF EXISTS public.v_staff_auth_overview CASCADE;

ALTER TABLE public.mdm_nhan_su
DROP COLUMN IF EXISTS ngay_sinh,
DROP COLUMN IF EXISTS gioi_tinh,
DROP COLUMN IF EXISTS so_dien_thoai,
DROP COLUMN IF EXISTS email;

-- Tạo lại v_mdm_nhan_su_full
CREATE OR REPLACE VIEW public.v_mdm_nhan_su_full AS
 SELECT ns.id,
    ns.ma_nv,
    ns.ho_ten,
    ns.khoa_id,
    ns.to_id,
    ns.nghe_nghiep_id,
    ns.chuc_vu_id,
    ns.chuc_danh_id,
    ns.vai_tro_he_thong_id,
    ns.auth_user_id,
    (ns.extra_data->>'ngay_sinh')::date AS ngay_sinh,
    ns.extra_data->>'gioi_tinh' AS gioi_tinh,
    ns.extra_data->>'so_dien_thoai' AS so_dien_thoai,
    ns.extra_data->>'email' AS email,
    ns.extra_data,
    ns.is_active,
    k.ten_khoa,
    t.name AS ten_to,
    nn.name AS ten_nghe_nghiep,
    cv.name AS chuc_vu,
    cd.name AS chuc_danh,
    r.name AS vai_tro_he_thong_ksnk,
    cv.name AS ten_chuc_vu,
    cd.name AS ten_chuc_danh,
    r.name AS ten_vai_tro,
    ns.created_at,
    ns.updated_at
   FROM ((((((mdm_nhan_su ns
     LEFT JOIN dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN dm_lookup_value nn ON (((ns.nghe_nghiep_id = nn.id) AND (nn.category_type = 'NGHE_NGHIEP'::text))))
     LEFT JOIN dm_lookup_value cd ON (((ns.chuc_danh_id = cd.id) AND (cd.category_type = 'CHUC_DANH'::text))))
     LEFT JOIN dm_lookup_value cv ON (((ns.chuc_vu_id = cv.id) AND (cv.category_type = 'CHUC_VU'::text))))
     LEFT JOIN dm_lookup_value t ON (((ns.to_id = t.id) AND (t.category_type = 'TO_CONG_TAC'::text))))
     LEFT JOIN dm_roles r ON ((ns.vai_tro_he_thong_id = r.id)));

-- Tạo lại v_auth_user_permissions
CREATE OR REPLACE VIEW public.v_auth_user_permissions AS
SELECT
    ns.id AS staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    ns.extra_data->>'email' AS email,
    ns.khoa_id,
    ns.is_active,
    kp.ten_khoa AS ten_khoa_phong,
    kp.ma_khoa AS ma_khoa_phong,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL),
      '[]'::jsonb
    ) AS roles,
    COALESCE(
      jsonb_agg(DISTINCT jsonb_build_object('id', p.id, 'module_name', p.module_name, 'action', p.action)) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) AS permissions
FROM mdm_nhan_su ns
LEFT JOIN dm_khoa_phong kp ON kp.id = ns.khoa_id
LEFT JOIN rel_user_roles ur ON ur.user_id = ns.auth_user_id
LEFT JOIN dm_roles r ON r.id = ur.role_id
LEFT JOIN rel_role_permissions rp ON rp.role_id = r.id
LEFT JOIN dm_permissions p ON p.id = rp.permission_id
GROUP BY ns.id, ns.auth_user_id, ns.ho_ten, ns.ma_nv, ns.extra_data, ns.khoa_id, ns.is_active, kp.ten_khoa, kp.ma_khoa;

-- Tạo lại v_staff_auth_overview
CREATE OR REPLACE VIEW public.v_staff_auth_overview AS
SELECT
    ns.id,
    ns.ma_nv,
    ns.ho_ten,
    ns.extra_data->>'email' AS email,
    ns.is_active,
    ns.auth_user_id,
    COALESCE(
      array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL),
      ARRAY[]::text[]
    ) AS role_names
FROM mdm_nhan_su ns
LEFT JOIN rel_user_roles ur ON ur.user_id = ns.auth_user_id
LEFT JOIN dm_roles r ON r.id = ur.role_id
GROUP BY ns.id;


-- =============================================================================
-- ƯU TIÊN 4: DỌN CỘT THỪA FACT_*
-- =============================================================================

-- 4A. fact_giam_sat_chung_sessions: chuyển 6 cột phụ → metadata jsonb
ALTER TABLE public.fact_giam_sat_chung_sessions
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Xóa trigger cũ gãy liên kết (gọi đến bảng fact_giam_sat_chung_results đã bị xóa)
DROP TRIGGER IF EXISTS trg_sync_gsc_session ON public.fact_giam_sat_chung_sessions;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_row() CASCADE;

UPDATE public.fact_giam_sat_chung_sessions
SET metadata = jsonb_build_object(
    'is_manual_nhan_vien', is_manual_nhan_vien,
    'ten_manual_nhan_vien', ten_manual_nhan_vien,
    'is_bo_sung_nguoi_benh', is_bo_sung_nguoi_benh,
    'ma_nguoi_benh', ma_nguoi_benh,
    'ten_nguoi_benh', ten_nguoi_benh,
    'so_giuong_nguoi_benh', so_giuong_nguoi_benh
)
WHERE is_manual_nhan_vien = true
   OR ten_manual_nhan_vien IS NOT NULL
   OR is_bo_sung_nguoi_benh = true
   OR ma_nguoi_benh IS NOT NULL
   OR ten_nguoi_benh IS NOT NULL
   OR so_giuong_nguoi_benh IS NOT NULL;

-- Dọn null keys
UPDATE public.fact_giam_sat_chung_sessions
SET metadata = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(metadata)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
    AND value != 'false'::jsonb
)
WHERE metadata != '{}'::jsonb;

-- Drop view phụ thuộc
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;

ALTER TABLE public.fact_giam_sat_chung_sessions
DROP COLUMN IF EXISTS is_manual_nhan_vien,
DROP COLUMN IF EXISTS ten_manual_nhan_vien,
DROP COLUMN IF EXISTS is_bo_sung_nguoi_benh,
DROP COLUMN IF EXISTS ma_nguoi_benh,
DROP COLUMN IF EXISTS ten_nguoi_benh,
DROP COLUMN IF EXISTS so_giuong_nguoi_benh;


-- 4B. fact_giam_sat_nkbv_ca: chuyển 3 cột text dài → clinical_notes jsonb
ALTER TABLE public.fact_giam_sat_nkbv_ca
ADD COLUMN IF NOT EXISTS clinical_notes jsonb DEFAULT '{}'::jsonb;

UPDATE public.fact_giam_sat_nkbv_ca
SET clinical_notes = jsonb_build_object(
    'tom_tat_dien_bien', tom_tat_dien_bien,
    'bien_phap_phong_ngua', bien_phap_phong_ngua,
    'ly_do_loai_tru', ly_do_loai_tru
)
WHERE tom_tat_dien_bien IS NOT NULL
   OR bien_phap_phong_ngua IS NOT NULL
   OR ly_do_loai_tru IS NOT NULL;

UPDATE public.fact_giam_sat_nkbv_ca
SET clinical_notes = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(clinical_notes)
  WHERE value IS NOT NULL AND jsonb_typeof(value) != 'null'
)
WHERE clinical_notes != '{}'::jsonb;

DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;

ALTER TABLE public.fact_giam_sat_nkbv_ca
DROP COLUMN IF EXISTS tom_tat_dien_bien,
DROP COLUMN IF EXISTS bien_phap_phong_ngua,
DROP COLUMN IF EXISTS ly_do_loai_tru;

-- Tạo lại v_fact_giam_sat_nkbv_ca_full
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
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM (((fact_giam_sat_nkbv_ca c
     LEFT JOIN dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN dm_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN dm_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));


-- 4C. DROP cột legacy
DROP VIEW IF EXISTS public.vw_vst_hotpath CASCADE;

ALTER TABLE public.fact_giam_sat_vst DROP COLUMN IF EXISTS legacy_csv_row_id;

CREATE OR REPLACE VIEW public.vw_vst_hotpath AS
 SELECT id,
    session_id,
    nhan_vien_id,
    ten_nhan_vien_ngoai,
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

-- DROP legacy_danh_muc_id còn sót trên các bảng vật lý
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;
ALTER TABLE public.dm_loai_dung_cu DROP COLUMN IF EXISTS legacy_danh_muc_id;

CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
 SELECT l.id,
    l.ma_loai,
    l.ten_loai,
    l.mo_ta,
    l.created_at,
    l.updated_at,
    l.is_active,
    l.ma_loai_dung_cu,
    l.ten_loai_dung_cu,
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
-- DỌN DẸP: Chuyển dm_bo_dung_cu_chi_tiet.co_ma_khac, ma_khac → specs
-- =============================================================================
UPDATE public.dm_bo_dung_cu_chi_tiet
SET specs = COALESCE(specs, '{}'::jsonb) || jsonb_build_object(
    'co_ma_khac', co_ma_khac,
    'ma_khac', ma_khac
)
WHERE co_ma_khac = true OR ma_khac IS NOT NULL;

ALTER TABLE public.dm_bo_dung_cu_chi_tiet
DROP COLUMN IF EXISTS co_ma_khac,
DROP COLUMN IF EXISTS ma_khac;

-- Cập nhật v_dm_bo_dung_cu_chi_tiet_full nếu nó đã bị ảnh hưởng
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.ma_loai_dung_cu,
    l.ten_loai_dung_cu,
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

COMMIT;
