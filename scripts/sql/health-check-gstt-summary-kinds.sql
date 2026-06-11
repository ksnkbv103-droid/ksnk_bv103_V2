-- Health check: gstt_fact_*_summary phải là VIEW live (D-07), không còn TABLE pre-agg.
SELECT
  c.relname AS object_name,
  CASE c.relkind WHEN 'v' THEN 'view' WHEN 'r' THEN 'table' WHEN 'm' THEN 'materialized_view' END AS kind,
  c.relkind = 'v' AS is_live_view_ok
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'gstt_fact_%summary%'
ORDER BY 1;
