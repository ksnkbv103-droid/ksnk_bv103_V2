-- Health check: GSTT summary objects + triggers (read-only)
SELECT c.relname AS object_name,
       CASE c.relkind WHEN 'v' THEN 'view' WHEN 'r' THEN 'table' WHEN 'm' THEN 'materialized_view' END AS kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname LIKE 'gstt_fact_%summary%'
ORDER BY 1;

SELECT tgname AS trigger_name,
       c.relname AS table_name,
       p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND (c.relname LIKE 'gstt_fact_%' OR p.proname LIKE '%sync%gsc%' OR p.proname LIKE '%sync%vst%')
ORDER BY c.relname, tgname;

SELECT COUNT(*) FILTER (WHERE cach_tinh_diem IS NULL) AS null_cach_tinh_diem,
       COUNT(*) AS total_active
FROM gstt_dm_bang_kiem
WHERE is_active = true;
