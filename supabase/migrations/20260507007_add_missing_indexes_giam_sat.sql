-- Migration: Bổ sung INDEX cho bảng giám sát chính
-- Lý do: fact_giam_sat_chung_sessions và fact_giam_sat_vst_sessions
--         KHÔNG có INDEX trên cột FK → View JOIN chậm, pagination Seq Scan
-- Tham chiếu: AGENTS.md 5b, Playbook 3a, Audit Report 2026-05-07

-- ============================================================
-- 1. fact_giam_sat_chung_sessions — bảng giám sát bảng kiểm chung
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gsc_sessions_khoa_id
  ON public.fact_giam_sat_chung_sessions USING btree (khoa_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_khu_vuc_id
  ON public.fact_giam_sat_chung_sessions USING btree (khu_vuc_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_nguoi_giam_sat_id
  ON public.fact_giam_sat_chung_sessions USING btree (nguoi_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_nhan_vien_id
  ON public.fact_giam_sat_chung_sessions USING btree (nhan_vien_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_nghe_nghiep_id
  ON public.fact_giam_sat_chung_sessions USING btree (nghe_nghiep_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_created_at
  ON public.fact_giam_sat_chung_sessions USING btree (created_at DESC);

-- Composite index cho pagination query phổ biến: lọc theo khoa + sắp theo ngày
CREATE INDEX IF NOT EXISTS idx_gsc_sessions_khoa_created
  ON public.fact_giam_sat_chung_sessions USING btree (khoa_id, created_at DESC);

-- ============================================================
-- 2. fact_giam_sat_vst_sessions — phiên giám sát vệ sinh tay
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vst_sessions_khoa_id
  ON public.fact_giam_sat_vst_sessions USING btree (khoa_id);

CREATE INDEX IF NOT EXISTS idx_vst_sessions_khu_vuc_id
  ON public.fact_giam_sat_vst_sessions USING btree (khu_vuc_id);

CREATE INDEX IF NOT EXISTS idx_vst_sessions_nguoi_giam_sat_id
  ON public.fact_giam_sat_vst_sessions USING btree (nguoi_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_vst_sessions_created_at
  ON public.fact_giam_sat_vst_sessions USING btree (created_at DESC);

-- Composite index cho pagination + lọc theo khoa
CREATE INDEX IF NOT EXISTS idx_vst_sessions_khoa_created
  ON public.fact_giam_sat_vst_sessions USING btree (khoa_id, created_at DESC);

-- ============================================================
-- 3. fact_activity_log — bảng audit, sẽ lớn nhanh
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activity_log_userid
  ON public.fact_activity_log USING btree (userid);

CREATE INDEX IF NOT EXISTS idx_activity_log_tablename
  ON public.fact_activity_log USING btree (tablename);

CREATE INDEX IF NOT EXISTS idx_activity_log_recordid
  ON public.fact_activity_log USING btree (recordid);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
  ON public.fact_activity_log USING btree (created_at DESC);

-- Composite: tra cứu audit theo bảng + thời gian
CREATE INDEX IF NOT EXISTS idx_activity_log_table_created
  ON public.fact_activity_log USING btree (tablename, created_at DESC);
