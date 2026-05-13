-- EXPLAIN — Command Center: bảng theo khoa + workload nhân viên KSNK
-- Cửa sổ ~6 tháng lịch (khớp `BV103_ANALYTICS_DEFAULT_MONTHS` / `bv103-analytics-default-range.ts`).
-- Chạy trên DB pilot/staging khi điều tra chi phí RPC (ANALYZE có ghi thật — tránh prod cao tải).

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_dashboard_khoa_overview_rows(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '5 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[]
);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '5 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[]
);
