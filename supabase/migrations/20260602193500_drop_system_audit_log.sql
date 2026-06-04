-- Remove system audit log subsystem end-to-end (UI + DB).
-- Scope: drop audit views/table/functions and detach all audit triggers.

BEGIN;

-- 1) Unschedule any cron jobs that still call audit purge (if pg_cron exists).
DO $$
DECLARE
  rec record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR rec IN
      SELECT jobname
      FROM cron.job
      WHERE command ILIKE '%fn_sys_audit_log_purge%'
         OR jobname ILIKE '%audit%'
    LOOP
      PERFORM cron.unschedule(rec.jobname);
    END LOOP;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

-- 2) Remove all triggers bound to audit trigger function.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND (
        t.tgname ILIKE '%audit%'
        OR t.tgfoid = 'public.fn_sys_audit_row()'::regprocedure
        OR EXISTS (
          SELECT 1
          FROM pg_proc p
          WHERE p.oid = t.tgfoid
            AND p.proname IN ('fn_trigger_audit_vst_gsc', 'fn_bv103_audit_row')
        )
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I;',
      rec.trigger_name,
      rec.schema_name,
      rec.table_name
    );
  END LOOP;
END;
$$;

-- 3) Drop audit read views.
DROP VIEW IF EXISTS public.v_sys_audit_table_choices;
DROP VIEW IF EXISTS public.v_sys_audit_log_full;

-- 4) Drop table (indexes/policies/constraints cascade with table).
DROP TABLE IF EXISTS public.sys_audit_log;

-- 5) Drop functions.
DROP FUNCTION IF EXISTS public.fn_sys_audit_log_purge(integer);
DROP FUNCTION IF EXISTS public.fn_sys_audit_attach(regclass);
DROP FUNCTION IF EXISTS public.fn_sys_audit_row();

COMMIT;
