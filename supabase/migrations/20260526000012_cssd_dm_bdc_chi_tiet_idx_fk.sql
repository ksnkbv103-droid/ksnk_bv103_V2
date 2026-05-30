-- Migration B.3 (Phase B — CSSD-ERP hardening, 26/05/2026):
-- Thêm index trên `cssd_dm_bo_dung_cu_chi_tiet.bo_dung_cu_id` (FK → cssd_dm_bo_dung_cu.id).
--
-- Lý do (đo bằng EXPLAIN ANALYZE 26/05):
--   • View `v_cssd_bo_dung_cu_summary` JOIN
--       cssd_dm_bo_dung_cu (99 r) ⨝ cssd_dm_bo_dung_cu_chi_tiet (3960 r) ON c.bo_dung_cu_id = b.id
--   • Bảng chi_tiet chỉ có index trên `id` và `loai_dung_cu_id`, **KHÔNG có index** trên FK
--     `bo_dung_cu_id` → planner không cherry-pick được matching rows; phải merge/sort toàn bộ.
--   • Baseline 26/05: TOP 50 từ view → 472 ms (50 row).
--
-- Sau khi thêm index: kỳ vọng <50 ms (tương đương các view summary khác).
-- Risk: thấp — index thêm 1 chiều, không động cấu trúc/data.

CREATE INDEX IF NOT EXISTS idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id
  ON public.cssd_dm_bo_dung_cu_chi_tiet (bo_dung_cu_id);

COMMENT ON INDEX public.idx_cssd_dm_bo_dung_cu_chi_tiet_bo_dung_cu_id IS
  'B.3 26/05/2026 — phục vụ JOIN v_cssd_bo_dung_cu_summary + mọi query lấy chi tiết theo bo_dung_cu.';
