-- EXPLAIN — rpc_get_dashboard_summary_table (~6 tháng lịch, khớp app mặc định)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_dashboard_summary_table(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '5 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[]
);
