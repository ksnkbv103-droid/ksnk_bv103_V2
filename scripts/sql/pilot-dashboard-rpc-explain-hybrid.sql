-- EXPLAIN — Dashboard hybrid (Command Center + module tabs) sau reform 2026-05-30.
-- Cửa sổ ~3 tháng lịch (khớp BV103_ANALYTICS_DEFAULT_MONTHS / bv103-analytics-default-range.ts).
-- Chạy trên staging/pilot; ANALYZE ghi thật — tránh prod cao tải.

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

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_dashboard_gsc_strategic_analytics(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::text[],
  NULL::text[]
);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_compliance_dashboard_v4(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid
);

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date,
  CURRENT_DATE::date,
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[],
  NULL::uuid[]
);
