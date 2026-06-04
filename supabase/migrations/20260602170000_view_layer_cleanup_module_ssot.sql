-- View layer cleanup: DROP orphan read views, flatten lookup middleware (dm_* → sys_lookup),
-- DROP unused fact_* CSSD compat views. GSTT read views JOIN dm_* thay vì gstt_dm_* / mdm_dm_*.
-- App contract dm_* (registry) giữ; Supabase bớt lớp trùng. Xem docs/core/database-view-catalog.md.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Orphan read views (không có ref trong src/)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_cssd_bo_dung_cu_full;
DROP VIEW IF EXISTS public.v_gstt_bang_kiem_full;
DROP VIEW IF EXISTS public.v_mdm_khoa_phong_full;
DROP VIEW IF EXISTS public.v_cssd_lo_tiet_khuan_full;
DROP VIEW IF EXISTS public.v_cssd_kho_le_realtime_qty;

-- ---------------------------------------------------------------------------
-- 2) GSTT read views trước — bỏ phụ thuộc mdm_dm_nghe_nghiep / gstt_dm_* lookup
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_giam_sat_chung_sessions_full;
DROP VIEW IF EXISTS public.v_gstt_giam_sat_vst_full;
DROP VIEW IF EXISTS public.v_gstt_giam_sat_vst_sessions_full;

-- ---------------------------------------------------------------------------
-- 3) Flatten lookup: dm_* đọc thẳng sys_lookup_value (bỏ mdm_dm_* / gstt_dm_* / qlcv_dm_* / nkbv_dm_*)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.dm_chuc_danh CASCADE;
DROP VIEW IF EXISTS public.dm_chuc_vu CASCADE;
DROP VIEW IF EXISTS public.dm_khoi_khoa CASCADE;
DROP VIEW IF EXISTS public.dm_nghe_nghiep CASCADE;
DROP VIEW IF EXISTS public.dm_to_cong_tac CASCADE;
DROP VIEW IF EXISTS public.dm_hinh_thuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.dm_cach_thuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.dm_loai_cong_viec CASCADE;
DROP VIEW IF EXISTS public.dm_trang_thai_cong_viec CASCADE;
DROP VIEW IF EXISTS public.dm_loai_nkbv CASCADE;
DROP VIEW IF EXISTS public.dm_trang_thai_nkbv_ca CASCADE;

DROP VIEW IF EXISTS public.mdm_dm_chuc_danh;
DROP VIEW IF EXISTS public.mdm_dm_chuc_vu;
DROP VIEW IF EXISTS public.mdm_dm_khoi_khoa;
DROP VIEW IF EXISTS public.mdm_dm_nghe_nghiep;
DROP VIEW IF EXISTS public.mdm_dm_to_cong_tac;
DROP VIEW IF EXISTS public.gstt_dm_cach_thuc_giam_sat;
DROP VIEW IF EXISTS public.gstt_dm_hinh_thuc_giam_sat;
DROP VIEW IF EXISTS public.gstt_dm_khu_vuc_giam_sat;
DROP VIEW IF EXISTS public.qlcv_dm_loai_cong_viec;
DROP VIEW IF EXISTS public.qlcv_dm_trang_thai_cong_viec;
DROP VIEW IF EXISTS public.nkbv_dm_loai;
DROP VIEW IF EXISTS public.nkbv_dm_trang_thai_ca;

CREATE VIEW public.dm_chuc_danh WITH (security_invoker = true) AS
 SELECT id, code AS ma_chuc_danh, name AS ten_chuc_danh, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CHUC_DANH';

CREATE VIEW public.dm_chuc_vu WITH (security_invoker = true) AS
 SELECT id, code AS ma_chuc_vu, name AS ten_chuc_vu, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CHUC_VU';

CREATE VIEW public.dm_khoi_khoa WITH (security_invoker = true) AS
 SELECT id, code AS ma_khoi, name AS ten_khoi, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'KHOI_KHOA';

CREATE VIEW public.dm_nghe_nghiep WITH (security_invoker = true) AS
 SELECT id, code AS ma_nghe_nghiep, name AS ten_nghe_nghiep, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'NGHE_NGHIEP';

CREATE VIEW public.dm_to_cong_tac WITH (security_invoker = true) AS
 SELECT id, code AS ma_to, name AS ten_to, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TO_CONG_TAC';

CREATE VIEW public.dm_hinh_thuc_giam_sat WITH (security_invoker = true) AS
 SELECT id, code AS ma_hinh_thuc, name AS ten_hinh_thuc, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'HINH_THUC_GIAM_SAT';

CREATE VIEW public.dm_cach_thuc_giam_sat WITH (security_invoker = true) AS
 SELECT id, code AS ma_cach_thuc, name AS ten_cach_thuc, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CACH_THUC_GIAM_SAT';

CREATE VIEW public.dm_loai_cong_viec WITH (security_invoker = true) AS
 SELECT id,
    code AS ma,
    name AS ten,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'LOAI_CONG_VIEC';

CREATE VIEW public.dm_trang_thai_cong_viec WITH (security_invoker = true) AS
 SELECT id,
    code AS ma,
    name AS ten,
    metadata ->> 'mau_sac' AS mau_sac,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_CONG_VIEC';

CREATE VIEW public.dm_loai_nkbv WITH (security_invoker = true) AS
 SELECT id, code AS ma_loai, name AS ten_loai, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'LOAI_NKBV';

CREATE VIEW public.dm_trang_thai_nkbv_ca WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_trang_thai,
    name AS ten_trang_thai,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA';

COMMENT ON VIEW public.dm_chuc_danh IS 'MDM compat API → sys_lookup_value (CHUC_DANH). SSOT module: sys_lookup_value.';
COMMENT ON VIEW public.dm_hinh_thuc_giam_sat IS 'GSTT compat API → sys_lookup_value. Đọc UI: v_gstt_* JOIN view này.';
COMMENT ON VIEW public.dm_cach_thuc_giam_sat IS 'GSTT compat API → sys_lookup_value. Đọc UI: v_gstt_* JOIN view này.';

-- ---------------------------------------------------------------------------
-- 4) GSTT read views — JOIN dm_* (sau flatten), giữ cach_tinh_diem từ migration 20260602000000
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_gstt_giam_sat_chung_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id, s.bang_kiem_id, bk.ma_bk AS loai_bang_kiem, bk.loai_giam_sat, bk.cach_tinh_diem,
  s.khoa_id, s.khu_vuc_id, s.vi_tri, s.hinh_thuc_id, s.cach_thuc_id,
  s.nguoi_giam_sat_id, s.is_giam_sat_ca_nhan, s.nhan_vien_id, s.nghe_nghiep_id,
  s.ngay_giam_sat, s.thoi_gian_ghi_nhan, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc,
  s.tong_diem, s.ghi_chu_chung,
  COALESCE((s.metadata ->> 'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien,
  s.metadata ->> 'ten_manual_nhan_vien' AS ten_manual_nhan_vien,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  s.metadata ->> 'ma_nguoi_benh' AS ma_nguoi_benh,
  s.metadata ->> 'ten_nguoi_benh' AS ten_nguoi_benh,
  s.metadata ->> 'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh,
  s.is_active, s.is_seen, s.created_at, s.updated_at, s.results_jsonb,
  s.dat_tron_goi, s.du_lieu_nghi_van,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat, ns_gs.ma_nv AS ma_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien, ns_nv.ma_nv AS ma_nhan_vien,
  nn.ma_nghe_nghiep, nn.ten_nghe_nghiep,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
FROM public.gstt_fact_chung_sessions s
LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_full WITH (security_invoker = true) AS
SELECT
  o.id, o.session_id, o.nhan_vien_id,
  o.metadata ->> 'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai,
  COALESCE(ns.ho_ten, o.metadata ->> 'ten_nhan_vien_ngoai') AS ten_nhan_vien,
  o.khoa_id, o.khu_vuc_id, o.nghe_nghiep_id, o.vi_tri, o.ngay_giam_sat,
  o.thoi_diem, o.hanh_dong, o.dung_ky_thuat, o.du_thoi_gian, o.co_deo_gang,
  o.thoi_gian_ghi_nhan, o.ghi_chu,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
  COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
  nn.ma_nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
  k.ten_khoa AS ten_khoa_phong,
  o.metadata ->> 'legacy_csv_row_id' AS legacy_csv_row_id,
  o.created_at
FROM public.gstt_fact_vst o
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = o.nhan_vien_id;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
SELECT
  s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat,
  s.created_at, s.updated_at, s.is_active, s.is_seen,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::bigint) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::bigint) AS da_tuan_thu
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT session_id, sum(so_co_hoi) AS tong_co_hoi, sum(da_tuan_thu) AS da_tuan_thu
  FROM public.gstt_fact_vst_opportunities_summary
  GROUP BY session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_chung_sessions_full TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) CSSD module façades: dm_tram / dm_loai_may → cssd_dm_* (một tên module trên lookup)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.dm_tram_cssd;
DROP VIEW IF EXISTS public.dm_loai_may_tiet_khuan;

CREATE VIEW public.dm_tram_cssd WITH (security_invoker = true) AS
 SELECT id, ma_tram, ten_tram, thu_tu, is_active, created_at, updated_at FROM public.cssd_dm_tram;

CREATE VIEW public.dm_loai_may_tiet_khuan WITH (security_invoker = true) AS
 SELECT id, ma_loai_may, ten_loai_may, is_active, created_at, updated_at FROM public.cssd_dm_loai_may;

COMMENT ON VIEW public.dm_tram_cssd IS 'Compat app/registry → cssd_dm_tram (SSOT lookup TRAM_CSSD).';
COMMENT ON VIEW public.cssd_dm_tram IS 'SSOT module CSSD — trạm workflow (sys_lookup_value TRAM_CSSD).';
COMMENT ON VIEW public.cssd_dm_loai_may IS 'SSOT module CSSD — loại máy tiệt khuẩn (sys_lookup_value LOAI_MAY_TIET_KHUAN).';

-- ---------------------------------------------------------------------------
-- 6) DROP fact_* compat — app dùng cssd_fact_* / qlcv_fact_* trực tiếp
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.fact_bao_tri_thiet_bi;
DROP VIEW IF EXISTS public.fact_cssd_dieu_chuyen_thanh_phan;
DROP VIEW IF EXISTS public.fact_cssd_lifecycle_event;
DROP VIEW IF EXISTS public.fact_kho_chi_tiet;
DROP VIEW IF EXISTS public.fact_kho_giao_dich;
DROP VIEW IF EXISTS public.fact_kho_hoa_chat_giao_dich;
DROP VIEW IF EXISTS public.fact_lo_tiet_khuan;
DROP VIEW IF EXISTS public.fact_quy_trinh_thanh_phan;
DROP VIEW IF EXISTS public.fact_su_co;

COMMIT;
