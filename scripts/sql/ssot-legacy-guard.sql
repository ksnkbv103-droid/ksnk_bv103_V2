-- SSOT legacy guard — một dòng JSON (fail-fast khi chạy tay: xem *_ok = false).
SELECT jsonb_build_object(
  'legacy_khu_vuc_prefix_ok', NOT EXISTS (
    SELECT 1 FROM public.sys_lookup_value
    WHERE category_type = 'KHU_VUC_GIAM_SAT'
      AND code ~ '^KV_(TR|DO|VA|XA)_'
  ),
  'legacy_compat_views_ok', NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'v'
      AND c.relname IN (
        'dm_khoa_phong', 'dm_bang_kiem', 'dm_tram_cssd',
        'fact_cong_viec', 'fact_giam_sat_vst_sessions', 'fact_giam_sat_chung_sessions'
      )
  ),
  'legacy_qlcv_spawn_fn_ok', NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fn_fact_cong_viec_spawn_dinh_ky_hom_nay'
  ),
  'gstt_summary_tables_ok', NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname LIKE 'gstt_fact_%summary%'
  ),
  'dm_tram_cssd_in_functions_ok', NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) LIKE '%dm_tram_cssd%'
  ),
  'active_khu_vuc_count', (
    SELECT count(*) FROM public.sys_lookup_value
    WHERE category_type = 'KHU_VUC_GIAM_SAT' AND is_active = true
  )
) AS ssot_legacy_guard;
