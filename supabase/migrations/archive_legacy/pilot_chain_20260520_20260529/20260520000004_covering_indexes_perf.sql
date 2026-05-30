-- Migration: Covering Indexes for Dashboard & Task Performance (Nhóm A & C)
-- Description: Adds covering indexes on key transaction tables to optimize dashboard metrics, search/filters, and overdue task sync operations.

-- 1. Index cho fact_giam_sat_vst_sessions
-- Tối ưu hóa truy vấn khi filter khoa_id trước, ngay_giam_sat sau (hoặc composite index cho các analytical queries lọc theo khoa)
CREATE INDEX IF NOT EXISTS idx_vst_sessions_khoa_ngay_active
  ON public.fact_giam_sat_vst_sessions USING btree (khoa_id, ngay_giam_sat)
  WHERE (is_active = true);

-- 2. Index cho fact_giam_sat_chung_sessions
-- Tối ưu hóa truy vấn Dashboard GSC: lọc khoa_id, ngay_giam_sat, bang_kiem_id
CREATE INDEX IF NOT EXISTS idx_gsc_sessions_khoa_ngay_bk
  ON public.fact_giam_sat_chung_sessions USING btree (khoa_id, ngay_giam_sat, bang_kiem_id)
  WHERE (is_active = true);

-- 3. Index cho fact_cong_viec
-- Tối ưu hóa cho truy vấn công việc (Track B): lọc theo trang_thai_id, han_hoan_thanh và trạng thái hoạt động (is_active)
CREATE INDEX IF NOT EXISTS idx_fact_cong_viec_trang_thai_han_active
  ON public.fact_cong_viec USING btree (trang_thai_id, han_hoan_thanh)
  WHERE (is_active = true);
