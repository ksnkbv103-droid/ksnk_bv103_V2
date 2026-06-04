-- EXPLAIN — rpc_dashboard_vst_strategic_analytics (~3 tháng)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_dashboard_vst_strategic_analytics(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::text[]
);
