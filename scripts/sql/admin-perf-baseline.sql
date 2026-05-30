-- Đo baseline performance 3 hotpath admin module sau khi phát hành 9 migration ngày 26/05.
-- Kèm metadata DB hiện tại để so sánh.
SELECT '=== Metadata ===' AS section;
SELECT now() AS measured_at,
       (SELECT count(*) FROM public.sys_audit_log) AS audit_log_rows,
       (SELECT count(*) FROM public.sys_lookup_value) AS lookup_value_rows,
       (SELECT count(*) FROM public.mdm_nhan_su) AS nhan_su_rows;

SELECT '=== A. fn_admin_module_stats() ===' AS section;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT public.fn_admin_module_stats();

SELECT '=== B. v_sys_audit_log_full first page (LIMIT 25 sorted desc) ===' AS section;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.v_sys_audit_log_full
ORDER BY changed_at DESC
LIMIT 25;

SELECT '=== C. v_sys_audit_log_full filtered by table_name + action ===' AS section;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.v_sys_audit_log_full
WHERE table_name = 'sys_lookup_value'
  AND action = 'INSERT'
ORDER BY changed_at DESC
LIMIT 25;

SELECT '=== D. v_sys_audit_table_choices ===' AS section;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.v_sys_audit_table_choices ORDER BY last_changed_at DESC;
