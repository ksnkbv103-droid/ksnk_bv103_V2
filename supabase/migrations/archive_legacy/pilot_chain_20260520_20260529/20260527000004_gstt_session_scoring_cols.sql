-- Migration: Slice 4 (giam-sat-tuan-thu reform v4) — Cột summary scoring cho phiên giám sát.
-- Date: 27/05/2026
--
-- Mục tiêu:
--   * Thêm 2 cột summary lên `gstt_fact_chung_sessions`:
--       - dat_tron_goi      boolean nullable — kết quả All-or-None Care Bundle.
--                            CHỈ có giá trị khi `gstt_dm_bang_kiem.cach_tinh_diem='TRON_GOI'`.
--                            Còn lại NULL.
--       - du_lieu_nghi_van  boolean DEFAULT false — Anti-Hawthorne flag (tốc độ
--                            quan sát >30 ô/phút hoặc start=end). App tính ở engine.
--   * Backward compat: phiên cũ vẫn load (cả 2 cột nullable / default false).
--   * Slice 5 hook write action sẽ điền cột này khi submit phiên.
--
-- Lưu ý view:
--   * `v_fact_giam_sat_chung_sessions_full` SELECT cột explicit — chưa pickup
--     2 cột mới. KHÔNG recreate ở migration này (để tránh CASCADE rộng); Slice 5
--     hoặc Slice 7 dashboard sẽ tái tạo khi cần JOIN.
--   * Code app SELECT * vào `gstt_fact_chung_sessions` thì tự pickup ngay.

ALTER TABLE public.gstt_fact_chung_sessions
  ADD COLUMN IF NOT EXISTS dat_tron_goi      boolean,
  ADD COLUMN IF NOT EXISTS du_lieu_nghi_van  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gstt_fact_chung_sessions.dat_tron_goi IS
  'Slice 4 (reform v4): kết quả All-or-None cho care bundle (cach_tinh_diem=TRON_GOI). NULL khi bảng kiểm không phải bundle. TRUE chỉ khi mọi tiêu chí then chốt (`la_then_chot=true` hoặc tất cả) DAT.';
COMMENT ON COLUMN public.gstt_fact_chung_sessions.du_lieu_nghi_van IS
  'Slice 4 (reform v4): Anti-Hawthorne flag — TRUE nếu phiên có dấu hiệu nghi ngờ (tốc độ quan sát >30/phút, hoặc thoi_gian_bat_dau = thoi_gian_ket_thuc). Dashboard Slice 7 cảnh báo nhưng KHÔNG loại trừ khỏi KPI (chính sách Just Culture defer v2).';

-- Index hỗ trợ dashboard Slice 7 lọc bundle compliance rate.
CREATE INDEX IF NOT EXISTS idx_gstt_session_dat_tron_goi
  ON public.gstt_fact_chung_sessions (bang_kiem_id, dat_tron_goi)
  WHERE is_active = true AND dat_tron_goi IS NOT NULL;
