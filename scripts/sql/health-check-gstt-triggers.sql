-- Health check: sync triggers on gstt fact tables
SELECT tgname AS trigger_name,
       c.relname AS table_name,
       p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname LIKE 'gstt_fact_%'
ORDER BY c.relname, tgname;
