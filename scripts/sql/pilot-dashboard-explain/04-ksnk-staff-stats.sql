-- EXPLAIN — rpc_get_dashboard_ksnk_staff_supervision_stats (~3 tháng)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[]
);
