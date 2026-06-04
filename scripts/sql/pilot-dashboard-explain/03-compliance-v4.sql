-- EXPLAIN — rpc_get_compliance_dashboard_v4 (~3 tháng)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_compliance_dashboard_v4(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid
);
