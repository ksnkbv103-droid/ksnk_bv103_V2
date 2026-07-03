-- Compare archive snapshot coverage: sample missing IDs if archive_id_list provided.
-- Standalone: report linked DB vs expected archive counts + date gaps.
SELECT jsonb_build_object(
  'linked_vst_sessions', (SELECT COUNT(*) FROM public.gstt_fact_vst_sessions),
  'linked_vst_active', (SELECT COUNT(*) FROM public.gstt_fact_vst_sessions WHERE is_active = true),
  'linked_vst_obs', (SELECT COUNT(*) FROM public.gstt_fact_vst),
  'linked_gsc_sessions', (SELECT COUNT(*) FROM public.gstt_fact_chung_sessions),
  'linked_gsc_with_results_jsonb', (
    SELECT COUNT(*) FROM public.gstt_fact_chung_sessions
    WHERE results_jsonb IS NOT NULL AND results_jsonb::text NOT IN ('null', '{}', '[]')
  ),
  'vst_sessions_before_2024', (
    SELECT COUNT(*) FROM public.gstt_fact_vst_sessions
    WHERE is_active = true AND ngay_giam_sat < '2024-01-01'
  ),
  'vst_sessions_2024', (
    SELECT COUNT(*) FROM public.gstt_fact_vst_sessions
    WHERE is_active = true AND ngay_giam_sat >= '2024-01-01' AND ngay_giam_sat < '2025-01-01'
  ),
  'gsc_sessions_before_2026', (
    SELECT COUNT(*) FROM public.gstt_fact_chung_sessions
    WHERE is_active = true AND ngay_giam_sat < '2026-01-01'
  ),
  'vst_null_khoa', (
    SELECT COUNT(*) FROM public.gstt_fact_vst_sessions WHERE khoa_id IS NULL
  ),
  'gsc_null_khoa', (
    SELECT COUNT(*) FROM public.gstt_fact_chung_sessions WHERE khoa_id IS NULL
  ),
  'vst_null_nguoi_gs', (
    SELECT COUNT(*) FROM public.gstt_fact_vst_sessions WHERE nguoi_giam_sat_id IS NULL
  ),
  'archive_expected', jsonb_build_object(
    'vst_sessions', 2094,
    'vst_observations', 21940,
    'gsc_sessions', 14,
    'gsc_results_eav', 188,
    'source', 'supabase/archive/data-pgdump-deprecated-202606.sql'
  ),
  'delta_vs_archive', jsonb_build_object(
    'vst_sessions', (SELECT COUNT(*) FROM public.gstt_fact_vst_sessions) - 2094,
    'vst_observations', (SELECT COUNT(*) FROM public.gstt_fact_vst) - 21940,
    'gsc_sessions', (SELECT COUNT(*) FROM public.gstt_fact_chung_sessions) - 14
  )
) AS archive_parity;
