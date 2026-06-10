-- Phase 2: VST strategic RPC — inline fact scan (stype once per session).
-- Removes 4x live summary view re-evaluation. Output shape unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH session_base AS MATERIALIZED (
    SELECT
      s.id AS session_id,
      s.ngay_giam_sat,
      s.khoa_id,
      s.khu_vuc_id,
      s.nguoi_giam_sat_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype
    FROM public.gstt_fact_vst_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
  ),
  session_scoped AS MATERIALIZED (
    SELECT sb.*, k.khoi_id, k.ma_khoa, k.ten_khoa
    FROM session_base sb
    LEFT JOIN public.mdm_dm_khoa_phong k ON sb.khoa_id = k.id
    WHERE (p_khoa_ids IS NULL OR sb.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khu_vuc_ids IS NULL OR sb.khu_vuc_id = ANY(p_khu_vuc_ids))
  ),
  opp_core AS MATERIALIZED (
    SELECT
      ss.session_id,
      ss.ngay_giam_sat,
      COALESCE(d.khoa_id, ss.khoa_id) AS khoa_id,
      COALESCE(d.khu_vuc_id, ss.khu_vuc_id) AS khu_vuc_id,
      d.nghe_nghiep_id,
      ss.stype,
      1::bigint AS so_co_hoi,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END::bigint AS da_tuan_thu,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0
        ELSE 1
      END::bigint AS bo_sot,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.dung_ky_thuat = false THEN 1
        ELSE 0
      END::bigint AS loi_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.du_thoi_gian = false THEN 1
        ELSE 0
      END::bigint AS loi_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') NOT IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.co_deo_gang = true THEN 1
        ELSE 0
      END::bigint AS lam_dung_gang,
      ss.khoi_id,
      ss.ma_khoa,
      ss.ten_khoa
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
  ),
  opp_filtered AS (
    SELECT *
    FROM opp_core
    WHERE (p_hinh_thuc_ids IS NULL OR stype = ANY(p_hinh_thuc_ids))
  ),
  moments_filtered AS MATERIALIZED (
    SELECT
      btrim(m.moment_part, E' \t\n\r') AS moment_label,
      (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
      1::bigint AS so_quan_sat
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE (p_hinh_thuc_ids IS NULL OR ss.stype = ANY(p_hinh_thuc_ids))
      AND (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND btrim(m.moment_part, E' \t\n\r') <> ''

    UNION ALL

    SELECT
      '— Chưa ghi thời điểm trong phiếu'::text AS moment_label,
      (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
      1::bigint AS so_quan_sat
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_hinh_thuc_ids IS NULL OR ss.stype = ANY(p_hinh_thuc_ids))
      AND (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND NOT EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
          regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
          E'\\s*,\\s*'
        ) AS m2(moment_part)
        WHERE btrim(m2.moment_part, E' \t\n\r') <> ''
      )
  ),
  opp_window AS MATERIALIZED (
    SELECT COALESCE(d.khoa_id, sb.khoa_id) AS khoa_id, sb.stype, 1::bigint AS so_co_hoi
    FROM public.gstt_fact_vst d
    INNER JOIN session_base sb ON d.session_id = sb.session_id
  ),
  kpis AS (
    SELECT jsonb_build_object(
      'tong_phien', COALESCE(COUNT(DISTINCT session_id), 0),
      'tong_co_hoi', COALESCE(SUM(so_co_hoi), 0),
      'da_tuan_thu', COALESCE(SUM(da_tuan_thu), 0),
      'bo_sot', COALESCE(SUM(bo_sot), 0),
      'loi_ky_thuat', COALESCE(SUM(loi_ky_thuat), 0),
      'loi_thoi_gian', COALESCE(SUM(loi_thoi_gian), 0),
      'lam_dung_gang', COALESCE(SUM(lam_dung_gang), 0),
      'dung_ky_thuat', COALESCE(SUM(da_tuan_thu) - SUM(loi_ky_thuat), 0),
      'du_thoi_gian', COALESCE(SUM(da_tuan_thu) - SUM(loi_thoi_gian), 0),
      'ty_le_tuan_thu', CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END,
      'ty_le_dung_ky_thuat', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_ky_thuat))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
      'ty_le_du_thoi_gian', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_thoi_gian))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
      'ty_le_lam_dung_gang', CASE WHEN SUM(bo_sot) > 0 THEN ROUND((SUM(lam_dung_gang)::numeric * 100) / SUM(bo_sot), 1) ELSE 0 END
    ) AS payload
    FROM opp_filtered
  ),
  trendline AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) AS payload
    FROM (
      SELECT
        'Tuần ' || to_char(ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', ngay_giam_sat), 'DD/MM') || ')' AS label,
        MIN(ngay_giam_sat) AS min_date,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
      FROM opp_filtered
      GROUP BY 1
    ) t
  ),
  matrix_khoa AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
      FROM opp_filtered
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
    ) t
  ),
  matrix_nghe AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        COALESCE(n.id, md5('unknown')::uuid) AS id,
        COALESCE(n.name, 'Không rõ') AS ten,
        SUM(s.so_co_hoi) AS tong_co_hoi,
        SUM(s.da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
      FROM opp_filtered s
      LEFT JOIN public.sys_lookup_value n ON s.nghe_nghiep_id = n.id
      GROUP BY n.id, n.name
    ) t
  ),
  moments AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        moment_label AS ten,
        SUM(so_quan_sat) AS tong_co_hoi,
        SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END) AS da_tuan_thu,
        CASE WHEN SUM(so_quan_sat) > 0
          THEN ROUND((SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END)::numeric * 100) / SUM(so_quan_sat), 1)
          ELSE 0 END AS ty_le_tuan_thu
      FROM moments_filtered
      GROUP BY moment_label
    ) t
  ),
  gap_analysis AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) AS tgs_co_hoi,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END) AS tgs_dat,
        CASE WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_tgs,
        SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) AS ksnk_co_hoi,
        SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END) AS ksnk_dat,
        CASE WHEN SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_ksnk,
        CASE
          WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
           AND SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
            - ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL
        END AS do_lech
      FROM opp_core
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
      HAVING SUM(so_co_hoi) > 0
    ) t
  ),
  workload AS (
    SELECT jsonb_build_object(
      'khoa_tu_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'TU_GIAM_SAT'
      ),
      'khoa_duoc_ksnk_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_co_hoi', (
        SELECT COALESCE(SUM(so_co_hoi), 0) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_phien', (
        SELECT COUNT(*) FROM session_base WHERE stype = 'KSNK'
      ),
      'co_cau_giam_sat', (
        SELECT COALESCE(jsonb_agg(src), '[]'::jsonb)
        FROM (
          SELECT 'KSNK' AS ten, COALESCE(SUM(so_co_hoi), 0) AS so_co_hoi
          FROM opp_window WHERE stype = 'KSNK'
          UNION ALL
          SELECT 'TU_GIAM_SAT', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'TU_GIAM_SAT'
          UNION ALL
          SELECT 'CHEO', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'CHEO'
        ) src
      )
    ) AS payload
  )
  SELECT jsonb_build_object(
    'kpis', COALESCE((SELECT payload FROM kpis), '{}'::jsonb),
    'trendline', COALESCE((SELECT payload FROM trendline), '[]'::jsonb),
    'matrix_khoa', COALESCE((SELECT payload FROM matrix_khoa), '[]'::jsonb),
    'matrix_nghe', COALESCE((SELECT payload FROM matrix_nghe), '[]'::jsonb),
    'moments', COALESCE((SELECT payload FROM moments), '[]'::jsonb),
    'gap_analysis', COALESCE((SELECT payload FROM gap_analysis), '[]'::jsonb),
    'workload', COALESCE((SELECT payload FROM workload), '{}'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
