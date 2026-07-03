-- ID-level parity: every legacy session/obs ID from old project exists on prod.
-- Run on prod after scripts/gstt-gap-backfill.mjs; compare missing_* counts (expect 0).
-- Old project uses fact_giam_sat_* table names; pass IDs via temp import or external diff tool.
-- Quick integrity on prod post-backfill:
SELECT jsonb_build_object(
  'prod_vst_sessions', (SELECT COUNT(*) FROM public.gstt_fact_vst_sessions),
  'prod_vst_obs', (SELECT COUNT(*) FROM public.gstt_fact_vst),
  'prod_gsc_sessions', (SELECT COUNT(*) FROM public.gstt_fact_chung_sessions),
  'orphan_vst_obs', (
    SELECT COUNT(*) FROM public.gstt_fact_vst o
    WHERE NOT EXISTS (SELECT 1 FROM public.gstt_fact_vst_sessions s WHERE s.id = o.session_id)
  ),
  'invalid_khu_vuc_vst_sessions', (
    SELECT COUNT(*) FROM public.gstt_fact_vst_sessions s
    WHERE s.khu_vuc_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.sys_lookup_value lv WHERE lv.id = s.khu_vuc_id)
  ),
  'invalid_khu_vuc_vst_obs', (
    SELECT COUNT(*) FROM public.gstt_fact_vst o
    WHERE o.khu_vuc_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.sys_lookup_value lv WHERE lv.id = o.khu_vuc_id)
  ),
  'gsc_with_results_jsonb', (
    SELECT COUNT(*) FROM public.gstt_fact_chung_sessions
    WHERE results_jsonb IS NOT NULL AND results_jsonb::text NOT IN ('null', '{}', '[]')
  ),
  'gsc_invalid_bang_kiem', (
    SELECT COUNT(*) FROM public.gstt_fact_chung_sessions s
    WHERE s.bang_kiem_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.gstt_dm_bang_kiem b WHERE b.id = s.bang_kiem_id)
  )
) AS gstt_gap_parity;
