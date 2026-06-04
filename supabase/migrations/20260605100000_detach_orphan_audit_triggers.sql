-- Fix 42P01 khi lưu GSC/VST: bảng sys_audit_log đã DROP (20260602193500) nhưng trigger audit còn sót
-- (đặc biệt legacy trg_*_vst_gsc không gắn fn_sys_audit_row → bước DROP trigger cũ bỏ sót).

BEGIN;

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
        OR EXISTS (
          SELECT 1
          FROM pg_proc p
          WHERE p.oid = t.tgfoid
            AND p.proname IN (
              'fn_sys_audit_row',
              'fn_trigger_audit_vst_gsc',
              'fn_bv103_audit_row'
            )
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

DROP FUNCTION IF EXISTS public.fn_trigger_audit_vst_gsc() CASCADE;
DROP FUNCTION IF EXISTS public.fn_bv103_audit_row() CASCADE;

DROP VIEW IF EXISTS public.v_sys_audit_table_choices;
DROP VIEW IF EXISTS public.v_sys_audit_log_full;
DROP TABLE IF EXISTS public.sys_audit_log;
DROP FUNCTION IF EXISTS public.fn_sys_audit_log_purge(integer);
DROP FUNCTION IF EXISTS public.fn_sys_audit_attach(regclass);
DROP FUNCTION IF EXISTS public.fn_sys_audit_row() CASCADE;

COMMIT;
