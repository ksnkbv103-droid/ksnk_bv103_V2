-- Command Center / Cơ cấu nguồn: theo khoa — 3 nguồn × (VST cơ hội, VST phiên, phiên GSC).
-- Phân loại VST (stype) khớp rpc_get_vst_dashboard_v2 (20260511121). GSC giữ logic gsc_s hiện tại.

DROP FUNCTION IF EXISTS public.rpc_get_dashboard_khoa_overview_rows(date, date, uuid[], uuid[], uuid[], uuid[]);

CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_khoa_overview_rows(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH kscope AS (
    SELECT kp.id, kp.ten_khoa
    FROM public.dm_khoa_phong kp
    WHERE COALESCE(kp.is_active, true)
      AND (p_khoa_ids IS NULL OR kp.id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR kp.khoi_id IS NULL OR kp.khoi_id = ANY (p_khoi_ids))
  ),
  vst_s0 AS (
    SELECT
      s.id,
      s.khoa_id,
      s.khu_vuc_id,
      ns.khoa_id AS ns_khoa_id,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        WHEN ns.khoa_id IS NULL
             AND (
               k_t.id IS NULL
               OR (
                 (k_t.ma_khoa IS NULL OR k_t.ma_khoa NOT IN ('KSNK', 'C18'))
                 AND (k_t.ten_khoa IS NULL OR k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')
               )
             ) THEN 'KSNK'
        WHEN ns.khoa_id IS NULL
             AND k_t.id IS NOT NULL
             AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoi_ids IS NULL OR k_t.khoi_id IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
  ),
  vst_o AS (
    SELECT
      d.session_id,
      COALESCE(d.khoa_id, s.khoa_id) AS eff_khoa
    FROM public.fact_giam_sat_vst d
    JOIN vst_s0 s ON d.session_id = s.id
    WHERE (p_khoa_ids IS NULL OR COALESCE(d.khoa_id, s.khoa_id) = ANY (p_khoa_ids))
      AND (
        p_khoi_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.dm_khoa_phong ke
          WHERE ke.id = COALESCE(d.khoa_id, s.khoa_id)
            AND ke.khoi_id IS NOT NULL
            AND ke.khoi_id = ANY (p_khoi_ids)
        )
      )
      AND (
        p_nghe_nghiep_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.dm_nghe_nghiep nn
          WHERE nn.id = ANY (p_nghe_nghiep_ids)
            AND COALESCE(nn.is_active, true)
            AND d.nghe_nghiep IS NOT NULL
            AND btrim(d.nghe_nghiep) <> ''
            AND nn.ten_nghe_nghiep = d.nghe_nghiep
        )
      )
  ),
  vst_co_k AS (
    SELECT o.eff_khoa AS khoa_id, s.stype, count(*)::bigint AS n
    FROM vst_o o
    JOIN vst_s0 s ON o.session_id = s.id
    GROUP BY 1, 2
  ),
  vst_co_agg AS (
    SELECT
      khoa_id,
      coalesce(sum(n) FILTER (WHERE stype = 'KSNK'), 0)::bigint AS ksnk_vst_co_hoi,
      coalesce(sum(n) FILTER (WHERE stype = 'CHEO'), 0)::bigint AS cheo_vst_co_hoi,
      coalesce(sum(n) FILTER (WHERE stype = 'TU_GIAM_SAT'), 0)::bigint AS tu_gs_vst_co_hoi
    FROM vst_co_k
    GROUP BY khoa_id
  ),
  vst_ph_k AS (
    SELECT
      COALESCE(s.khoa_id, s.ns_khoa_id) AS khoa_id,
      s.stype,
      count(DISTINCT s.id)::bigint AS n
    FROM vst_s0 s
    WHERE EXISTS (SELECT 1 FROM vst_o o WHERE o.session_id = s.id)
      AND (p_khoa_ids IS NULL OR COALESCE(s.khoa_id, s.ns_khoa_id) = ANY (p_khoa_ids))
    GROUP BY 1, 2
  ),
  vst_ph_agg AS (
    SELECT
      khoa_id,
      coalesce(sum(n) FILTER (WHERE stype = 'KSNK'), 0)::bigint AS ksnk_vst_phien,
      coalesce(sum(n) FILTER (WHERE stype = 'CHEO'), 0)::bigint AS cheo_vst_phien,
      coalesce(sum(n) FILTER (WHERE stype = 'TU_GIAM_SAT'), 0)::bigint AS tu_gs_vst_phien
    FROM vst_ph_k
    GROUP BY khoa_id
  ),
  gsc_s AS (
    SELECT
      s.khoa_id,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
             OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
  ),
  gsc_g AS (
    SELECT
      khoa_id,
      count(*) FILTER (WHERE stype = 'TU_GIAM_SAT')::bigint AS tu_gs_gsc_phien,
      count(*) FILTER (WHERE stype = 'CHEO')::bigint AS cheo_gsc_phien,
      count(*) FILTER (WHERE stype = 'KSNK')::bigint AS ksnk_gsc_phien
    FROM gsc_s
    WHERE khoa_id IS NOT NULL
    GROUP BY khoa_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'khoa_id', k.id::text,
        'ten_khoa', k.ten_khoa,
        'ksnk_vst_co_hoi', COALESCE(cca.ksnk_vst_co_hoi, 0),
        'ksnk_vst_phien', COALESCE(vpa.ksnk_vst_phien, 0),
        'ksnk_gsc_phien', COALESCE(g.ksnk_gsc_phien, 0),
        'cheo_vst_co_hoi', COALESCE(cca.cheo_vst_co_hoi, 0),
        'cheo_vst_phien', COALESCE(vpa.cheo_vst_phien, 0),
        'cheo_gsc_phien', COALESCE(g.cheo_gsc_phien, 0),
        'tu_gs_vst_co_hoi', COALESCE(cca.tu_gs_vst_co_hoi, 0),
        'tu_gs_vst_phien', COALESCE(vpa.tu_gs_vst_phien, 0),
        'tu_gs_gsc_phien', COALESCE(g.tu_gs_gsc_phien, 0)
      )
      ORDER BY k.ten_khoa
    ),
    '[]'::jsonb
  )
  FROM kscope k
  LEFT JOIN vst_co_agg cca ON cca.khoa_id = k.id
  LEFT JOIN vst_ph_agg vpa ON vpa.khoa_id = k.id
  LEFT JOIN gsc_g g ON g.khoa_id = k.id
  WHERE
    COALESCE(cca.ksnk_vst_co_hoi, 0) > 0
    OR COALESCE(cca.cheo_vst_co_hoi, 0) > 0
    OR COALESCE(cca.tu_gs_vst_co_hoi, 0) > 0
    OR COALESCE(vpa.ksnk_vst_phien, 0) > 0
    OR COALESCE(vpa.cheo_vst_phien, 0) > 0
    OR COALESCE(vpa.tu_gs_vst_phien, 0) > 0
    OR COALESCE(g.ksnk_gsc_phien, 0) > 0
    OR COALESCE(g.cheo_gsc_phien, 0) > 0
    OR COALESCE(g.tu_gs_gsc_phien, 0) > 0;
$$;

COMMENT ON FUNCTION public.rpc_get_dashboard_khoa_overview_rows(date, date, uuid[], uuid[], uuid[], uuid[]) IS
  'Command Center: theo khoa — chuyên trách / chéo / tự GS × (VST cơ hội, VST phiên, phiên GSC); VST stype khớp dashboard V2.';
