-- Migration B.1 + B.2 (Phase B — CSSD-ERP hardening, 26/05/2026):
--   1. Attach audit trigger v2 (fn_sys_audit_row) cho 10 bảng cssd_fact_* hiện chưa có trigger
--      → mọi INSERT/UPDATE/DELETE sẽ ghi sys_audit_log với actor=auth.uid().
--   2. Vá 3 bảng cssd_fact_* đang RLS enabled NHƯNG không có policy:
--      cssd_fact_dieu_chuyen_thanh_phan, cssd_fact_kho_chi_tiet, cssd_fact_lifecycle_event.
--      Áp pattern legacy `qual:true` (authenticated-only) — đồng nhất với 7 fact CSSD khác,
--      KHÔNG nâng pattern permission gating ở phase này để tránh phá nghiệp vụ đang chạy.
--      Pattern Phase A (fn_sys_has_permission) sẽ apply sau khi app CSSD migrate user-client.
--
-- Tham chiếu:
--   • `docs/specs/working/admin-module-slice-plan.md` (Phase A Slice 3 audit trigger v2).
--   • Probe 26/05: 10 fact thiếu trigger, 3 fact thiếu policy.

-- ============================================================================
-- B.1 — Audit trigger v2 cho 10 cssd_fact_*
-- ============================================================================
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'cssd_fact_quy_trinh',
    'cssd_fact_quy_trinh_thanh_phan',
    'cssd_fact_lo_tiet_khuan',
    'cssd_fact_lifecycle_event',
    'cssd_fact_kho_giao_dich',
    'cssd_fact_kho_chi_tiet',
    'cssd_fact_dieu_chuyen_thanh_phan',
    'cssd_fact_kho_hoa_chat_giao_dich',
    'cssd_fact_bao_tri',
    'cssd_fact_su_co'
  ];
  v_trigger_name text;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    v_trigger_name := format('trg_%s_audit', v_table);

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=v_table AND c.relkind='r'
    ) THEN
      RAISE NOTICE '[cssd-audit] table % không tồn tại, bỏ qua', v_table;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=v_table AND t.tgname=v_trigger_name
    ) THEN
      RAISE NOTICE '[cssd-audit] trigger % đã có trên %, bỏ qua', v_trigger_name, v_table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row()',
      v_trigger_name, v_table
    );
    RAISE NOTICE '[cssd-audit] gắn trigger % cho %', v_trigger_name, v_table;
  END LOOP;
END $$;

-- ============================================================================
-- B.2 — Vá 3 cssd_fact_* thiếu policy (pattern legacy `qual:true` authenticated)
-- ============================================================================
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'cssd_fact_dieu_chuyen_thanh_phan',
    'cssd_fact_kho_chi_tiet',
    'cssd_fact_lifecycle_event'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=v_table AND c.relkind='r'
    ) THEN
      RAISE NOTICE '[cssd-rls-fill] table % không tồn tại, bỏ qua', v_table;
      CONTINUE;
    END IF;

    -- Policy SELECT cho authenticated.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename=v_table
         AND policyname=v_table || '_select_authenticated'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
        v_table || '_select_authenticated', v_table
      );
      RAISE NOTICE '[cssd-rls-fill] tạo SELECT policy cho %', v_table;
    END IF;

    -- Policy ALL (insert/update/delete) cho authenticated — giữ pattern legacy.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname='public' AND tablename=v_table
         AND policyname=v_table || '_all_authenticated'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        v_table || '_all_authenticated', v_table
      );
      RAISE NOTICE '[cssd-rls-fill] tạo ALL policy cho %', v_table;
    END IF;
  END LOOP;
END $$;
