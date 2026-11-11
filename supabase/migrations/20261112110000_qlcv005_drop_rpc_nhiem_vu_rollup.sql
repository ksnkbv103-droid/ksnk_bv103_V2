-- QLCV-005 (PO 2026-11-12, phương án c): xóa RPC rpc_qlcv_nhiem_vu_rollup.
-- Lý do: tạo ở 20260909030202 nhưng không nơi nào trong src gọi; tiến độ nhiệm vụ tính ở nơi khác.
-- Khôi phục: chạy lại khối CREATE FUNCTION + GRANT ở 20260909030202_qlcv_perf_batch12_rpcs.sql:114-138.
-- CHƯA APPLY PROD — chờ PO.

DROP FUNCTION IF EXISTS public.rpc_qlcv_nhiem_vu_rollup(uuid[]);
