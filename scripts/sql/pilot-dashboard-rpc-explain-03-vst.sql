-- EXPLAIN — rpc_get_vst_dashboard_v2
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_vst_dashboard_v2(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '5 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  'month'::text,
  'ALL'::text
);
