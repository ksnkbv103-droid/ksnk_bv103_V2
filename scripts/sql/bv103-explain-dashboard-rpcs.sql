-- Đo hiệu năng RPC dashboard (chạy trên DB pilot sau ANALYZE).
-- Thay ngày / UUID mẫu theo môi trường.

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.rpc_get_compliance_dashboard_v2(
  (CURRENT_DATE - INTERVAL '3 months')::date,
  CURRENT_DATE::date,
  NULL::uuid
);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM public.fact_giam_sat_vst v
WHERE v.session_id IN (
  SELECT id FROM public.fact_giam_sat_vst_sessions s
  WHERE s.ngay_giam_sat >= (CURRENT_DATE - INTERVAL '3 months')
  LIMIT 500
);

-- pg_stat_statements (cần extension + quyền superuser / supabase_admin):
-- SELECT calls, mean_exec_time::int, query
-- FROM pg_stat_statements
-- WHERE query ILIKE '%rpc_get_compliance%' OR query ILIKE '%fact_giam_sat_vst%'
-- ORDER BY mean_exec_time DESC LIMIT 20;
