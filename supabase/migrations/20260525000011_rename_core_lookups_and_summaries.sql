-- migration 20260525000011_rename_core_lookups_and_summaries.sql
BEGIN;

-- 1. DROP CÁC VIEWS PHỤ THUỘC KHI RENAME BẢNG CHÍNH (ĐỂ TRÁNH LỖI CASCADE HỆ THỐNG)
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;

-- 2. RENAME CÁC BẢNG HẠT NHÂN & GUIDELINES
ALTER TABLE IF EXISTS public.dm_lookup_value RENAME TO sys_lookup_value;
ALTER TABLE IF EXISTS public.dm_nkbv_cdc_baselines RENAME TO nkbv_dm_cdc_baseline;

-- 3. RENAME CÁC BẢNG FACT TIẾN TRÌNH & KHO CSSD
ALTER TABLE IF EXISTS public.fact_cssd_dieu_chuyen_thanh_phan RENAME TO cssd_fact_dieu_chuyen_thanh_phan;
ALTER TABLE IF EXISTS public.fact_kho_chi_tiet RENAME TO cssd_fact_kho_chi_tiet;

-- Dọn dẹp bảng giao dịch kho vật lý cũ dư thừa (đã được thay thế bởi cssd_fact_kho_giao_dich)
DROP TABLE IF EXISTS public.fact_kho_giao_dich CASCADE;

-- 4. RENAME CÁC BẢNG FACT TỔNG HỢP / PRE-AGGREGATION
ALTER TABLE IF EXISTS public.fact_gsc_dashboard_summary RENAME TO gstt_fact_gsc_dashboard_summary;
ALTER TABLE IF EXISTS public.fact_gsc_violations_summary RENAME TO gstt_fact_gsc_violations_summary;

ALTER TABLE IF EXISTS public.fact_vst_moments_summary RENAME TO gstt_fact_vst_moments_summary;
ALTER TABLE IF EXISTS public.fact_vst_opportunities_summary RENAME TO gstt_fact_vst_opportunities_summary;
ALTER TABLE IF EXISTS public.fact_vst_sessions_summary RENAME TO gstt_fact_vst_sessions_summary;

ALTER TABLE IF EXISTS public.fact_nkbv_mau_so_daily RENAME TO nkbv_fact_mau_so_daily;
ALTER TABLE IF EXISTS public.fact_nkbv_mau_so_phau_thuat RENAME TO nkbv_fact_mau_so_phau_thuat;


-- =========================================================================
-- 5. TẠO CÁC VIEWS TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY LAYER)
-- =========================================================================
CREATE OR REPLACE VIEW public.dm_lookup_value WITH (security_invoker='true') AS 
SELECT * FROM public.sys_lookup_value;

CREATE OR REPLACE VIEW public.dm_nkbv_cdc_baselines WITH (security_invoker='true') AS 
SELECT * FROM public.nkbv_dm_cdc_baseline;

CREATE OR REPLACE VIEW public.fact_cssd_dieu_chuyen_thanh_phan WITH (security_invoker='true') AS 
SELECT * FROM public.cssd_fact_dieu_chuyen_thanh_phan;

CREATE OR REPLACE VIEW public.fact_kho_chi_tiet WITH (security_invoker='true') AS 
SELECT * FROM public.cssd_fact_kho_chi_tiet;

CREATE OR REPLACE VIEW public.fact_kho_giao_dich WITH (security_invoker='true') AS 
SELECT * FROM public.cssd_fact_kho_giao_dich;

CREATE OR REPLACE VIEW public.fact_gsc_dashboard_summary WITH (security_invoker='true') AS 
SELECT * FROM public.gstt_fact_gsc_dashboard_summary;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker='true') AS 
SELECT * FROM public.gstt_fact_gsc_violations_summary;

CREATE OR REPLACE VIEW public.fact_vst_moments_summary WITH (security_invoker='true') AS 
SELECT * FROM public.gstt_fact_vst_moments_summary;

CREATE OR REPLACE VIEW public.fact_vst_opportunities_summary WITH (security_invoker='true') AS 
SELECT * FROM public.gstt_fact_vst_opportunities_summary;

CREATE OR REPLACE VIEW public.fact_vst_sessions_summary WITH (security_invoker='true') AS 
SELECT * FROM public.gstt_fact_vst_sessions_summary;

CREATE OR REPLACE VIEW public.fact_nkbv_mau_so_daily WITH (security_invoker='true') AS 
SELECT * FROM public.nkbv_fact_mau_so_daily;

CREATE OR REPLACE VIEW public.fact_nkbv_mau_so_phau_thuat WITH (security_invoker='true') AS 
SELECT * FROM public.nkbv_fact_mau_so_phau_thuat;


-- =========================================================================
-- 6. TÁI TẠO CÁC VIEWS PHẲNG (FLATTENED VIEWS) TRỎ TRỰC TIẾP VÀO BẢNG TIÊU CHUẨN
-- =========================================================================
CREATE OR REPLACE VIEW public.v_fact_lo_tiet_khuan_full WITH (security_invoker='true') AS
 SELECT lot.id, lot.ma_lo_tiet_khuan, lot.thiet_bi_id, tb.ten_thiet_bi, lot.loai_may_id, lm.code AS ma_loai_may, lm.name AS ten_loai_tiet_khuan, CASE WHEN lot.ket_qua_test IS TRUE THEN 'HOAN_THANH'::text WHEN lot.ket_qua_test IS FALSE THEN 'QC_KHONG_DAT'::text WHEN lot.tk_mo_form_qc_at IS NOT NULL THEN 'CHO_DANH_GIA_QC'::text WHEN lot.tk_chot_nap_at IS NOT NULL THEN 'DANG_TIET_KHUAN'::text ELSE 'DANG_CHUAN_NAP'::text END AS trang_thai, lot.tk_chot_nap_at, lot.tk_mo_form_qc_at, lot.tk_qc_json, lot.ket_qua_test, lot.is_active, lot.created_at, lot.updated_at
 FROM cssd_fact_lo_tiet_khuan lot
 LEFT JOIN cssd_dm_thiet_bi tb ON tb.id = lot.thiet_bi_id
 LEFT JOIN sys_lookup_value lm ON lm.id = lot.loai_may_id AND lm.category_type = 'LOAI_MAY_TIET_KHUAN';

COMMIT;
