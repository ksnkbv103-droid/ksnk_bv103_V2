-- Migration: Drop 13 legacy physically tables and replace them with SQL Views mapping to dm_lookup_value
-- Date: 20/05/2026

-- ----------------------------------------------------
-- 1. Drop Legacy Foreign Key Constraints pointing to 13 legacy lookup tables
-- ----------------------------------------------------
ALTER TABLE public.dm_bo_dung_cu_chi_tiet DROP CONSTRAINT IF EXISTS dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey;
ALTER TABLE public.dm_bo_dung_cu DROP CONSTRAINT IF EXISTS dm_bo_dung_cu_loai_dung_cu_id_fkey;
ALTER TABLE public.fact_cong_viec_dinh_ky DROP CONSTRAINT IF EXISTS fact_cong_viec_dinh_ky_to_cong_tac_id_fkey;
ALTER TABLE public.fact_cong_viec DROP CONSTRAINT IF EXISTS fact_cong_viec_to_cong_tac_id_fkey;
ALTER TABLE public.fact_giam_sat_chung_sessions DROP CONSTRAINT IF EXISTS fact_giam_sat_chung_sessions_cach_thuc_id_fkey;
ALTER TABLE public.fact_giam_sat_chung_sessions DROP CONSTRAINT IF EXISTS fact_giam_sat_chung_sessions_hinh_thuc_id_fkey;
ALTER TABLE public.fact_giam_sat_vst_sessions DROP CONSTRAINT IF EXISTS fact_giam_sat_vst_sessions_cach_thuc_id_fkey;
ALTER TABLE public.fact_giam_sat_vst_sessions DROP CONSTRAINT IF EXISTS fact_giam_sat_vst_sessions_hinh_thuc_id_fkey;
ALTER TABLE public.fact_cong_viec DROP CONSTRAINT IF EXISTS fk_cong_viec_loai_cong_viec;
ALTER TABLE public.fact_cong_viec DROP CONSTRAINT IF EXISTS fk_cong_viec_trang_thai_dm;
ALTER TABLE public.dm_thiet_bi DROP CONSTRAINT IF EXISTS fk_dm_thiet_bi_loai_may;
ALTER TABLE public.fact_lo_tiet_khuan DROP CONSTRAINT IF EXISTS fk_lo_tiet_khuan_loai_may;
ALTER TABLE public.fact_su_co DROP CONSTRAINT IF EXISTS fk_su_co_loai_su_co;
ALTER TABLE public.fact_giam_sat_vst DROP CONSTRAINT IF EXISTS fk_vst_obs_nghe_nghiep;
ALTER TABLE public.fact_giam_sat_chung_sessions DROP CONSTRAINT IF EXISTS giam_sat_chung_sessions_nghe_nghiep_id_fkey;
ALTER TABLE public.fact_giam_sat_nkbv_ca DROP CONSTRAINT IF EXISTS giam_sat_nkbv_ca_loai_nkbv_id_fkey;
ALTER TABLE public.fact_giam_sat_nkbv_ca DROP CONSTRAINT IF EXISTS giam_sat_nkbv_ca_trang_thai_id_fkey;
ALTER TABLE public.mdm_nhan_su DROP CONSTRAINT IF EXISTS ho_so_nhan_vien_chuc_danh_id_fkey;
ALTER TABLE public.mdm_nhan_su DROP CONSTRAINT IF EXISTS ho_so_nhan_vien_chuc_vu_id_fkey;
ALTER TABLE public.mdm_nhan_su DROP CONSTRAINT IF EXISTS ho_so_nhan_vien_to_id_fkey;
ALTER TABLE public.mdm_nhan_su DROP CONSTRAINT IF EXISTS mdm_nhan_su_nghe_nghiep_id_fkey;

-- ----------------------------------------------------
-- 2. Drop legacy physical tables
-- ----------------------------------------------------
DROP TABLE IF EXISTS public.dm_cach_thuc_giam_sat CASCADE;
DROP TABLE IF EXISTS public.dm_chuc_danh CASCADE;
DROP TABLE IF EXISTS public.dm_chuc_vu CASCADE;
DROP TABLE IF EXISTS public.dm_hinh_thuc_giam_sat CASCADE;
DROP TABLE IF EXISTS public.dm_loai_cong_viec CASCADE;
DROP TABLE IF EXISTS public.dm_loai_dung_cu CASCADE;
DROP TABLE IF EXISTS public.dm_loai_may_tiet_khuan CASCADE;
DROP TABLE IF EXISTS public.dm_loai_nkbv CASCADE;
DROP TABLE IF EXISTS public.dm_loai_su_co CASCADE;
DROP TABLE IF EXISTS public.dm_nghe_nghiep CASCADE;
DROP TABLE IF EXISTS public.dm_to_cong_tac CASCADE;
DROP TABLE IF EXISTS public.dm_trang_thai_cong_viec CASCADE;
DROP TABLE IF EXISTS public.dm_trang_thai_nkbv_ca CASCADE;

-- ----------------------------------------------------
-- 3. Recreate them as backward-compatible SQL Views pointing to dm_lookup_value
-- ----------------------------------------------------

-- dm_cach_thuc_giam_sat
CREATE OR REPLACE VIEW public.dm_cach_thuc_giam_sat WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_cach_thuc,
  name AS ten_cach_thuc,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'CACH_THUC_GIAM_SAT';

-- dm_chuc_danh
CREATE OR REPLACE VIEW public.dm_chuc_danh WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_chuc_danh,
  name AS ten_chuc_danh,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'CHUC_DANH';

-- dm_chuc_vu
CREATE OR REPLACE VIEW public.dm_chuc_vu WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_chuc_vu,
  name AS ten_chuc_vu,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'CHUC_VU';

-- dm_hinh_thuc_giam_sat
CREATE OR REPLACE VIEW public.dm_hinh_thuc_giam_sat WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_hinh_thuc,
  name AS ten_hinh_thuc,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'HINH_THUC_GIAM_SAT';

-- dm_loai_cong_viec
CREATE OR REPLACE VIEW public.dm_loai_cong_viec WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma,
  name AS ten,
  COALESCE((metadata->>'thu_tu')::integer, 0) AS thu_tu,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_CONG_VIEC';

-- dm_loai_dung_cu
CREATE OR REPLACE VIEW public.dm_loai_dung_cu WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_loai,
  name AS ten_loai,
  description AS mo_ta,
  created_at,
  updated_at,
  is_active,
  code AS ma_loai_dung_cu,
  name AS ten_loai_dung_cu,
  (metadata->>'hinh_dang') AS hinh_dang,
  (metadata->>'kich_thuoc') AS kich_thuoc,
  (metadata->>'cong_dung') AS cong_dung,
  (metadata->>'kha_nang_chiu_nhiet') AS kha_nang_chiu_nhiet,
  (metadata->>'phuong_phap_tiet_khuan') AS phuong_phap_tiet_khuan,
  NULL::uuid AS legacy_danh_muc_id,
  COALESCE((metadata->>'so_ngay_han_dung')::integer, 30) AS so_ngay_han_dung
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_DUNG_CU';

-- dm_loai_may_tiet_khuan
CREATE OR REPLACE VIEW public.dm_loai_may_tiet_khuan WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_loai_may,
  name AS ten_loai_may,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_MAY_TIET_KHUAN';

-- dm_loai_nkbv
CREATE OR REPLACE VIEW public.dm_loai_nkbv WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_loai,
  name AS ten_loai,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_NKBV';

-- dm_loai_su_co
CREATE OR REPLACE VIEW public.dm_loai_su_co WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_loai_su_co,
  name AS ten_loai_su_co,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'LOAI_SU_CO';

-- dm_nghe_nghiep
CREATE OR REPLACE VIEW public.dm_nghe_nghiep WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_nghe_nghiep,
  name AS ten_nghe_nghiep,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'NGHE_NGHIEP';

-- dm_to_cong_tac
CREATE OR REPLACE VIEW public.dm_to_cong_tac WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_to,
  name AS ten_to,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS legacy_danh_muc_id
FROM public.dm_lookup_value
WHERE category_type = 'TO_CONG_TAC';

-- dm_trang_thai_cong_viec
CREATE OR REPLACE VIEW public.dm_trang_thai_cong_viec WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma,
  name AS ten,
  (metadata->>'mau_sac') AS mau_sac,
  COALESCE((metadata->>'thu_tu')::integer, 0) AS thu_tu,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'TRANG_THAI_CONG_VIEC';

-- dm_trang_thai_nkbv_ca
CREATE OR REPLACE VIEW public.dm_trang_thai_nkbv_ca WITH (security_invoker='true') AS
SELECT 
  id,
  code AS ma_trang_thai,
  name AS ten_trang_thai,
  COALESCE((metadata->>'thu_tu')::integer, 0) AS thu_tu,
  is_active,
  created_at,
  updated_at
FROM public.dm_lookup_value
WHERE category_type = 'TRANG_THAI_NKBV_CA';

-- ----------------------------------------------------
-- 4. Establish Clean Constraints pointing directly to dm_lookup_value
-- ----------------------------------------------------
ALTER TABLE public.dm_bo_dung_cu_chi_tiet
  ADD CONSTRAINT dm_bo_dung_cu_chi_tiet_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.dm_bo_dung_cu
  ADD CONSTRAINT dm_bo_dung_cu_loai_dung_cu_id_fkey FOREIGN KEY (loai_dung_cu_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_cong_viec_dinh_ky
  ADD CONSTRAINT fact_cong_viec_dinh_ky_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_cong_viec
  ADD CONSTRAINT fact_cong_viec_to_cong_tac_id_fkey FOREIGN KEY (to_cong_tac_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD CONSTRAINT fact_giam_sat_chung_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD CONSTRAINT fact_giam_sat_chung_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_vst_sessions
  ADD CONSTRAINT fact_giam_sat_vst_sessions_cach_thuc_id_fkey FOREIGN KEY (cach_thuc_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_vst_sessions
  ADD CONSTRAINT fact_giam_sat_vst_sessions_hinh_thuc_id_fkey FOREIGN KEY (hinh_thuc_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_cong_viec
  ADD CONSTRAINT fk_cong_viec_loai_cong_viec FOREIGN KEY (loai_cong_viec_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.dm_thiet_bi
  ADD CONSTRAINT fk_dm_thiet_bi_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_lo_tiet_khuan
  ADD CONSTRAINT fk_lo_tiet_khuan_loai_may FOREIGN KEY (loai_may_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_su_co
  ADD CONSTRAINT fk_su_co_loai_su_co FOREIGN KEY (loai_su_co_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_vst
  ADD CONSTRAINT fk_vst_obs_nghe_nghiep FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD CONSTRAINT giam_sat_chung_sessions_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_nkbv_ca
  ADD CONSTRAINT giam_sat_nkbv_ca_loai_nkbv_id_fkey FOREIGN KEY (loai_nkbv_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.mdm_nhan_su
  ADD CONSTRAINT ho_so_nhan_vien_chuc_danh_id_fkey FOREIGN KEY (chuc_danh_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.mdm_nhan_su
  ADD CONSTRAINT ho_so_nhan_vien_chuc_vu_id_fkey FOREIGN KEY (chuc_vu_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.mdm_nhan_su
  ADD CONSTRAINT ho_so_nhan_vien_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.mdm_nhan_su
  ADD CONSTRAINT mdm_nhan_su_nghe_nghiep_id_fkey FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ----------------------------------------------------
-- 5. Set Comment descriptions
-- ----------------------------------------------------
COMMENT ON VIEW public.dm_cach_thuc_giam_sat IS 'View tương thích ngược cho cách thức giám sát, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_chuc_danh IS 'View tương thích ngược cho chức danh, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_chuc_vu IS 'View tương thích ngược cho chức vụ, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_hinh_thuc_giam_sat IS 'View tương thích ngược cho hình thức giám sát, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_loai_cong_viec IS 'View tương thích ngược cho loại công việc, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_loai_dung_cu IS 'View tương thích ngược cho loại dụng cụ với đầy đủ thuộc tính metadata dạng cột.';
COMMENT ON VIEW public.dm_loai_may_tiet_khuan IS 'View tương thích ngược cho loại máy tiệt khuẩn, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_loai_nkbv IS 'View tương thích ngược cho loại ca NKBV, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_loai_su_co IS 'View tương thích ngược cho loại sự cố CSSD, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_nghe_nghiep IS 'View tương thích ngược cho nghề nghiệp, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_to_cong_tac IS 'View tương thích ngược cho tổ công tác, trỏ sang dm_lookup_value.';
COMMENT ON VIEW public.dm_trang_thai_cong_viec IS 'View tương thích ngược cho trạng thái công việc với màu sắc và thứ tự sắp xếp.';
COMMENT ON VIEW public.dm_trang_thai_nkbv_ca IS 'View tương thích ngược cho trạng thái ca NKBV với thứ tự sắp xếp.';
