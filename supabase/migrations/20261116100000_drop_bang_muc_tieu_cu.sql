-- PO 2026-11-16: bỏ phần «mục tiêu viện» (lớp A). Giữ nguyên số liệu thống kê và fn_vst_is_valid_opportunity (khóa JSON chỉ số của RPC đổi ở 20261116110000).
-- Lý do: bảng ksnk_dm_muc_tieu_kpi trên local chỉ có 3 dòng seed 85.0 (khoa_id NULL), không có action ghi,
--   action đọc mục tiêu không nơi nào trong src gọi.
-- Khôi phục: lấy bảng + seed + RLS + GRANT từ file 20260729121000 và dòng index theo khoa từ 20260909004833
--   ở lịch sử git trước 2026-11-16, hoặc từ bản sao DB. Chỉ khôi phục được seed 85.0.
-- CHƯA APPLY PROD — chờ PO ra lệnh riêng (qua MCP apply_migration).
-- BẮT BUỘC trước khi apply prod (policy write_admin cho admin sửa dòng qua SQL/Studio, DROP không khôi phục dòng đã sửa):
--   SELECT metric_key, khoa_id, target_pct, is_active FROM public.ksnk_dm_muc_tieu_kpi
--   WHERE khoa_id IS NOT NULL OR target_pct <> 85.0;   -- phải trả 0 dòng; nếu có → xuất CSV rồi hỏi PO.

DROP TABLE IF EXISTS public.ksnk_dm_muc_tieu_kpi;
