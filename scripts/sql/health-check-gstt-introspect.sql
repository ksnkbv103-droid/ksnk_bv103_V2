-- Health check: GSTT summary objects + sync triggers + cach_tinh_diem (single JSON row).
SELECT jsonb_build_object(
  'summary_objects', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'name', c.relname,
        'kind', CASE c.relkind WHEN 'v' THEN 'view' WHEN 'r' THEN 'table' WHEN 'm' THEN 'materialized_view' END
      ) ORDER BY c.relname
    ), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname LIKE 'gstt_fact_%summary%'
  ),
  'summary_all_views', NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'm')
      AND c.relname LIKE 'gstt_fact_%summary%'
  ),
  'sync_triggers', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'trigger', tgname,
        'table', c.relname,
        'function', p.proname
      ) ORDER BY c.relname, tgname
    ), '[]'::jsonb)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND (c.relname LIKE 'gstt_fact_%' OR p.proname LIKE '%sync%gsc%' OR p.proname LIKE '%sync%vst%')
  ),
  'bang_kiem_null_cach_tinh_diem', (
    SELECT COUNT(*) FILTER (WHERE cach_tinh_diem IS NULL)
    FROM public.gstt_dm_bang_kiem
    WHERE is_active = true
  ),
  'bang_kiem_active_total', (
    SELECT COUNT(*) FROM public.gstt_dm_bang_kiem WHERE is_active = true
  )
) AS gstt_health;
