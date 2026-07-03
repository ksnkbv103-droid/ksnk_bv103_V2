-- Probe: bảng audit đã DROP nhưng trigger/fn còn sót → lỗi 42P01 khi INSERT gstt_fact_chung_sessions.
-- Single-statement JSON for supabase db query runner.

SELECT jsonb_build_object(
  'sys_audit_log_exists', to_regclass('public.sys_audit_log') IS NOT NULL,
  'fn_sys_audit_row_exists', EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_sys_audit_row'
  ),
  'audit_triggers', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('table_name', c.relname, 'trigger_name', t.tgname)
      ORDER BY c.relname, t.tgname
    )
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND (
        t.tgname ILIKE '%audit%'
        OR t.tgfoid = (
          SELECT p.oid FROM pg_proc p
          JOIN pg_namespace ns ON ns.oid = p.pronamespace
          WHERE ns.nspname = 'public' AND p.proname = 'fn_sys_audit_row'
          LIMIT 1
        )
      )
  ), '[]'::jsonb)
) AS audit_orphan_probe;
