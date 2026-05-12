-- EXPLAIN — rpc_get_compliance_dashboard_multi_v1
-- Chỉ 1 mã bảng kiểm: trong multi, mỗi mã gọi v2 một lần; nhiều mã trong cùng transaction làm trùng temp table _gsc_sessions.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_compliance_dashboard_multi_v1(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '5 month')::date,
  CURRENT_DATE::date,
  COALESCE(
    ARRAY(
      SELECT NULLIF(btrim(ma_bk), '')
      FROM public.dm_bang_kiem
      WHERE COALESCE(is_active, true)
      ORDER BY ma_bk
      LIMIT 1
    ),
    ARRAY[]::text[]
  ),
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  'ALL'::text
);
