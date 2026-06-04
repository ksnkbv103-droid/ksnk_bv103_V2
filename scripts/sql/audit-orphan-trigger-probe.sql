-- Probe: bảng audit đã DROP nhưng trigger/fn còn sót → lỗi 42P01 khi INSERT gstt_fact_chung_sessions.
SELECT
  to_regclass('public.sys_audit_log') IS NOT NULL AS sys_audit_log_exists,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'fn_sys_audit_row') AS fn_sys_audit_row_exists;

SELECT c.relname AS table_name, t.tgname AS trigger_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND (
    t.tgname ILIKE '%audit%'
    OR t.tgfoid = (
      SELECT p.oid FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public' AND p.proname = 'fn_sys_audit_row' LIMIT 1
    )
  )
ORDER BY 1, 2;

-- Exit tiêu chí: không còn dòng trigger; sys_audit_log_exists có thể false (đã gỡ).
