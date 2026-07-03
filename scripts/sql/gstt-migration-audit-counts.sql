-- GSTT VST/GSC migration audit — row counts + date/khoa breakdown (single JSON row).
SELECT jsonb_build_object(
  'generated_at', now(),
  'vst_sessions', (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'inactive', COUNT(*) FILTER (WHERE is_active IS NOT true),
      'min_ngay', MIN(ngay_giam_sat),
      'max_ngay', MAX(ngay_giam_sat),
      'distinct_khoa', COUNT(DISTINCT khoa_id)
    )
    FROM public.gstt_fact_vst_sessions
  ),
  'vst_observations', (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'distinct_sessions', COUNT(DISTINCT session_id),
      'min_created', MIN(created_at),
      'max_created', MAX(created_at)
    )
    FROM public.gstt_fact_vst
  ),
  'gsc_sessions', (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE is_active = true),
      'inactive', COUNT(*) FILTER (WHERE is_active IS NOT true),
      'min_ngay', MIN(ngay_giam_sat),
      'max_ngay', MAX(ngay_giam_sat),
      'distinct_khoa', COUNT(DISTINCT khoa_id),
      'distinct_bang_kiem', COUNT(DISTINCT bang_kiem_id)
    )
    FROM public.gstt_fact_chung_sessions
  ),
  'vst_by_year', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('year', y, 'sessions', sessions, 'observations', observations)
      ORDER BY y
    ), '[]'::jsonb)
    FROM (
      SELECT
        EXTRACT(YEAR FROM s.ngay_giam_sat)::int AS y,
        COUNT(DISTINCT s.id) AS sessions,
        COUNT(o.id) AS observations
      FROM public.gstt_fact_vst_sessions s
      LEFT JOIN public.gstt_fact_vst o ON o.session_id = s.id
      WHERE s.is_active = true
      GROUP BY 1
    ) t
  ),
  'gsc_by_year', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('year', y, 'sessions', sessions)
      ORDER BY y
    ), '[]'::jsonb)
    FROM (
      SELECT
        EXTRACT(YEAR FROM ngay_giam_sat)::int AS y,
        COUNT(*) AS sessions
      FROM public.gstt_fact_chung_sessions
      WHERE is_active = true
      GROUP BY 1
    ) t
  ),
  'vst_top_khoa', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('khoa_id', khoa_id, 'ten_khoa', ten_khoa, 'sessions', sessions)
      ORDER BY sessions DESC
    ), '[]'::jsonb)
    FROM (
      SELECT s.khoa_id, k.ten_khoa, COUNT(*) AS sessions
      FROM public.gstt_fact_vst_sessions s
      LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
      WHERE s.is_active = true
      GROUP BY s.khoa_id, k.ten_khoa
      ORDER BY sessions DESC
      LIMIT 15
    ) t
  ),
  'gsc_top_khoa', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('khoa_id', khoa_id, 'ten_khoa', ten_khoa, 'sessions', sessions)
      ORDER BY sessions DESC
    ), '[]'::jsonb)
    FROM (
      SELECT s.khoa_id, k.ten_khoa, COUNT(*) AS sessions
      FROM public.gstt_fact_chung_sessions s
      LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
      WHERE s.is_active = true
      GROUP BY s.khoa_id, k.ten_khoa
      ORDER BY sessions DESC
      LIMIT 15
    ) t
  ),
  'gsc_by_loai', (
    SELECT coalesce(jsonb_agg(
      jsonb_build_object('loai_giam_sat', loai_giam_sat, 'sessions', sessions)
      ORDER BY sessions DESC
    ), '[]'::jsonb)
    FROM (
      SELECT COALESCE(b.loai_hinh_giam_sat, 'UNKNOWN') AS loai_giam_sat, COUNT(*) AS sessions
      FROM public.gstt_fact_chung_sessions s
      LEFT JOIN public.gstt_dm_bang_kiem b ON b.id = s.bang_kiem_id
      WHERE s.is_active = true
      GROUP BY 1
    ) t
  ),
  'orphan_vst_obs', (
    SELECT COUNT(*)
    FROM public.gstt_fact_vst o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gstt_fact_vst_sessions s WHERE s.id = o.session_id
    )
  ),
  'orphan_gsc_khoa', (
    SELECT COUNT(*)
    FROM public.gstt_fact_chung_sessions s
    WHERE s.khoa_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.mdm_dm_khoa_phong k WHERE k.id = s.khoa_id
      )
  )
) AS gstt_migration_audit;
