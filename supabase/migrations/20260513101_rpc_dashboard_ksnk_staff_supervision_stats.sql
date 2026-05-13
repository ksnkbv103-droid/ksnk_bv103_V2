-- Dashboard Command Center: thống kê theo từng nhân viên KSNK (đi giám sát chuyên trách).
-- VST: cơ hội vệ sinh tay + số phiên (chỉ phiên có ≥1 dòng VST sau bộ lọc, stype = KSNK).
-- GSC: số phiên giám sát chung (stype = KSNK), không lọc theo loại bảng kiểm.

CREATE OR REPLACE FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    WITH ksnk_staff AS (
      SELECT ns.id,
             COALESCE(NULLIF(btrim(ns.ho_ten), ''), NULLIF(btrim(ns.ma_nv), ''), ns.id::text) AS ho_ten,
             COALESCE(NULLIF(btrim(ns.ma_nv), ''), '—') AS ma_nv
      FROM public.mdm_nhan_su ns
      INNER JOIN public.dm_khoa_phong k ON ns.khoa_id = k.id
      WHERE COALESCE(ns.is_active, true)
        AND (k.ma_khoa IN ('KSNK', 'C18') OR k.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
    ),
    vst_sess0 AS (
      SELECT
        s.id,
        s.khoa_id,
        s.khu_vuc_id,
        s.nguoi_giam_sat_id,
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
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
    ),
    vst_opp AS (
      SELECT
        d.id,
        d.session_id,
        s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_vst d
      INNER JOIN vst_sess0 s ON d.session_id = s.id AND s.stype = 'KSNK' AND s.nguoi_giam_sat_id IS NOT NULL
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
              AND nn.is_active IS NOT FALSE
              AND d.nghe_nghiep IS NOT NULL
              AND btrim(d.nghe_nghiep) <> ''
              AND nn.ten_nghe_nghiep = d.nghe_nghiep
          )
        )
    ),
    vst_agg AS (
      SELECT
        o.nguoi_giam_sat_id AS ns_id,
        count(*)::bigint AS so_co_hoi_vst,
        count(DISTINCT o.session_id)::bigint AS so_phien_vst
      FROM vst_opp o
      GROUP BY 1
    ),
    gsc_sess AS (
      SELECT s.id, s.nguoi_giam_sat_id
      FROM public.fact_giam_sat_chung_sessions s
      LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
      LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      WHERE s.is_active = true
        AND s.ngay_giam_sat >= p_tu_ngay
        AND s.ngay_giam_sat <= p_den_ngay
        AND s.nguoi_giam_sat_id IS NOT NULL
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
        AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids))
        AND (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN ((k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                 OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END
        ) = 'KSNK'
    ),
    gsc_agg AS (
      SELECT g.nguoi_giam_sat_id AS ns_id, count(*)::bigint AS so_phien_gsc
      FROM gsc_sess g
      GROUP BY 1
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ks.id,
          'ho_ten', ks.ho_ten,
          'ma_nv', ks.ma_nv,
          'so_co_hoi_vst', COALESCE(v.so_co_hoi_vst, 0),
          'so_phien_vst', COALESCE(v.so_phien_vst, 0),
          'so_phien_gsc', COALESCE(g.so_phien_gsc, 0)
        )
        ORDER BY
          (COALESCE(v.so_co_hoi_vst, 0) + COALESCE(v.so_phien_vst, 0) + COALESCE(g.so_phien_gsc, 0)) DESC,
          ks.ho_ten
      ),
      '[]'::jsonb
    )
    FROM ksnk_staff ks
    LEFT JOIN vst_agg v ON v.ns_id = ks.id
    LEFT JOIN gsc_agg g ON g.ns_id = ks.id
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(date, date, uuid[], uuid[], uuid[], uuid[]) IS
  'Command Center: nhân viên KSNK — cơ hội VST + phiên VST + phiên GSC (nguồn chuyên trách KSNK, theo bộ lọc ngày/khoa/khối).';

GRANT EXECUTE ON FUNCTION public.rpc_get_dashboard_ksnk_staff_supervision_stats(date, date, uuid[], uuid[], uuid[], uuid[])
  TO anon, authenticated, service_role;
