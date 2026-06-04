-- QLCV pilot — bổ sung cho trial:db:precheck (chạy riêng khi debug QLCV).
-- npm run trial:qlcv:precheck  |  trial:qlcv:precheck:local

SELECT
  to_regclass('public.qlcv_fact_cong_viec') IS NOT NULL AS qlcv_fact_ok,
  to_regclass('public.qlcv_fact_cong_viec_hoat_dong') IS NOT NULL AS qlcv_timeline_ok,
  to_regclass('public.qlcv_fact_cong_viec_dinh_ky') IS NOT NULL AS qlcv_dinh_ky_ok,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'qlcv_fact_cong_viec'
      AND c.column_name = 'checklist'
  ) AS qlcv_checklist_col_ok,
  EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public' AND rel.relname = 'qlcv_fact_cong_viec'
      AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%trang_thai%'
  ) AS qlcv_trang_thai_check_ok,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_sync_overdue_tasks'
      AND pg_get_functiondef(p.oid) ILIKE '%qlcv_fact_cong_viec%'
  ) AS qlcv_sync_overdue_fn_ok,
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_qlcv_analytics_summary'
  ) AS qlcv_analytics_orphan_dropped_ok,
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'qlcv_fact_cong_viec'
      AND c.column_name IN ('trang_thai_id', 'loai_cong_viec_id', 'cong_viec_cha_id')
  ) AS qlcv_fk_cols_dropped_ok,
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_qlcv_sync_code_from_fk'
  ) AS qlcv_sync_trigger_dropped_ok,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'v_qlcv_cong_viec_full'
      AND c.column_name = 'trang_thai_mau_sac'
  ) AS qlcv_view_mau_sac_ok;
