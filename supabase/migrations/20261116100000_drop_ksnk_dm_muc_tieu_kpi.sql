-- PO 2026-11-16: bỏ phần «mục tiêu KPI» (lớp A). Giữ nguyên số liệu thống kê và fn_vst_is_valid_opportunity (khóa JSON chỉ số của RPC đổi ở 20261116110000).
-- Lý do: bảng ksnk_dm_muc_tieu_kpi trên local chỉ có 3 dòng seed 85.0 (khoa_id NULL), không có action ghi,
--   action đọc fetchMucTieuKpiVien không nơi nào trong src gọi.
-- Khôi phục: chạy lại 20260729121000_ksnk_dm_muc_tieu_kpi.sql (bảng + seed + RLS + GRANT) và
--   20260909004833_perf_fk_indexes_search_path.sql:39 (idx_ksnk_kpi_khoa). Chỉ khôi phục được seed 85.0.
-- CHƯA APPLY PROD — chờ PO ra lệnh riêng (qua MCP apply_migration).
-- BẮT BUỘC trước khi apply prod (policy write_admin cho admin sửa dòng qua SQL/Studio, DROP không khôi phục dòng đã sửa):
--   SELECT metric_key, khoa_id, target_pct, is_active FROM public.ksnk_dm_muc_tieu_kpi
--   WHERE khoa_id IS NOT NULL OR target_pct <> 85.0;   -- phải trả 0 dòng; nếu có → xuất CSV rồi hỏi PO.

DROP TABLE IF EXISTS public.ksnk_dm_muc_tieu_kpi;
