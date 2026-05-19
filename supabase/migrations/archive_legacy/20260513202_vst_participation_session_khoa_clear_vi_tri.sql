-- 1) Xóa dữ liệu cột vi_tri cũ trên dòng cơ hội VST (import lệch); vị trí phiên dùng fact_giam_sat_vst_sessions.vi_tri_cu_the + nhập tay.
UPDATE public.fact_giam_sat_vst SET vi_tri = NULL WHERE vi_tri IS NOT NULL;

-- 2) participation (dashboard): đếm theo khoa PHIÊN (s.khoa_id), fallback khoa nhân sự giám sát — khớp bảng “phiên tự GS theo khoa” (vd. KSNK) thay vì gom theo khoa từng dòng cơ hội.

DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text, text);

CREATE OR REPLACE FUNCTION public.rpc_get_vst_dashboard_v2(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_trend_type text DEFAULT 'month',
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _vst_sess0 ON COMMIT DROP AS
  SELECT s.*,
         k_ns.ma_khoa AS ns_ma_khoa,
         k_ns.ten_khoa AS ns_ten_khoa,
         k_t.ma_khoa AS t_ma_khoa,
         k_t.ten_khoa AS t_ten_khoa,
         k_t.ten_khoa AS ten_khoa_duoc_gs,
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
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  IF p_supervision_type IS NOT NULL AND p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess0 WHERE stype <> p_supervision_type;
  END IF;

  CREATE TEMP TABLE _vst_opp ON COMMIT DROP AS
  SELECT d.*,
         CASE
           WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN true
           WHEN lower(
             regexp_replace(
               translate(lower(unaccent(coalesce(d.hanh_dong, ''))), 'đ', 'd'),
               E'\\s+',
               ' ',
               'g'
             )
           ) IN ('rua tay bang nuoc', 'cha tay bang con') THEN true
           ELSE false
         END AS is_tuan_thu
  FROM public.fact_giam_sat_vst d
  JOIN _vst_sess0 s ON d.session_id = s.id
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
    AND (p_nghe_nghiep_ids IS NULL OR EXISTS (
      SELECT 1
      FROM public.dm_nghe_nghiep nn
      WHERE nn.id = ANY (p_nghe_nghiep_ids)
        AND nn.is_active IS NOT FALSE
        AND d.nghe_nghiep IS NOT NULL
        AND btrim(d.nghe_nghiep) <> ''
        AND nn.ten_nghe_nghiep = d.nghe_nghiep
    ));

  CREATE TEMP TABLE _vst_sess ON COMMIT DROP AS
  SELECT s.*
  FROM _vst_sess0 s
  WHERE EXISTS (SELECT 1 FROM _vst_opp o WHERE o.session_id = s.id);

  CREATE TEMP TABLE _vst_moment_rows ON COMMIT DROP AS
  SELECT d.session_id,
         d.is_tuan_thu,
         d.dung_ky_thuat,
         d.du_thoi_gian,
         d.co_deo_gang,
         d.ngay_giam_sat,
         btrim(m.moment_part, E' \t\n\r') AS moment_label
  FROM _vst_opp d
  CROSS JOIN LATERAL unnest(string_to_array(COALESCE(d.thoi_diem, ''), ',')) AS m(moment_part)
  WHERE btrim(m.moment_part, E' \t\n\r') <> '';

  SELECT jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', (
      SELECT jsonb_build_object(
        'tong_phien', count(DISTINCT session_id),
        'tong_co_hoi', count(*),
        'da_tuan_thu', count(*) FILTER (WHERE is_tuan_thu = true),
        'bo_sot', count(*) FILTER (WHERE is_tuan_thu = false),
        'ty_le_tuan_thu', ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1)
      ) FROM _vst_opp
    ),
    'supervision_sources', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_phien DESC), '[]'::jsonb) FROM (
        SELECT
          CASE stype
            WHEN 'KSNK' THEN 'Chuyên trách (KSNK)'
            WHEN 'CHEO' THEN 'Giám sát chéo'
            ELSE 'Tự giám sát'
          END AS ten,
          count(*)::bigint AS so_phien
        FROM _vst_sess
        GROUP BY stype
      ) t
    ),
    'by_moment_table', (
      WITH agg AS (
        SELECT
          mr.moment_label,
          count(*)::bigint AS cnt_all,
          count(*) FILTER (WHERE mr.is_tuan_thu = false)::bigint AS n_bo_sot,
          count(*) FILTER (WHERE mr.is_tuan_thu = true)::bigint AS n_dat,
          MIN(
            CASE mr.moment_label
              WHEN 'Trước khi tiếp xúc người bệnh' THEN 1
              WHEN 'Trước khi làm thủ thuật vô khuẩn' THEN 2
              WHEN 'Sau khi có nguy cơ tiếp xúc với dịch' THEN 3
              WHEN 'Sau khi tiếp xúc người bệnh' THEN 4
              WHEN 'Sau khi tiếp xúc xung quanh người bệnh' THEN 5
              ELSE 99
            END
          ) AS sort_ord
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
      ),
      tot AS (
        SELECT
          COALESCE(SUM(n_bo_sot), 0)::numeric AS t_bo_sot,
          COALESCE(SUM(n_dat), 0)::numeric AS t_dat
        FROM agg
      )
      SELECT COALESCE(jsonb_agg(j.obj ORDER BY j.sort_ord), '[]'::jsonb)
      FROM (
        SELECT
          jsonb_build_object(
            'ten', a.moment_label,
            'tong', a.cnt_all,
            'n_bo_sot', a.n_bo_sot,
            'n_dat', a.n_dat,
            'ty_le_bo_sot', COALESCE(ROUND(a.n_bo_sot * 100.0 / NULLIF((SELECT t_bo_sot FROM tot), 0), 1), 0),
            'ty_le_tuan_thu', COALESCE(ROUND(a.n_dat * 100.0 / NULLIF((SELECT t_dat FROM tot), 0), 1), 0)
          ) AS obj,
          a.sort_ord
        FROM agg a
      ) j
    ),
    'participation', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_phien DESC), '[]'::jsonb) FROM (
        SELECT
          k_eff.id::text AS id,
          k_eff.ten_khoa AS ten,
          count(DISTINCT s.id)::bigint AS so_phien
        FROM _vst_sess s
        JOIN _vst_opp o ON o.session_id = s.id
        LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(s.khoa_id, ns.khoa_id)
        WHERE k_eff.id IS NOT NULL
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoa', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          k_eff.id::text AS id,
          COALESCE(k_eff.ten_khoa, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(o.khoa_id, s.khoa_id)
        GROUP BY k_eff.id, k_eff.ten_khoa
      ) t
    ),
    'by_khoi', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kk.ten_khoi, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khoa_phong k_eff ON k_eff.id = COALESCE(o.khoa_id, s.khoa_id)
        LEFT JOIN public.dm_khoi_khoa kk ON kk.id = k_eff.khoi_id
        GROUP BY kk.id, kk.ten_khoi
      ) t
    ),
    'by_doi_tuong', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(NULLIF(btrim(COALESCE(o.nghe_nghiep, '')), ''), '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        GROUP BY 1
      ) t
    ),
    'by_khu_vuc', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ty_le DESC), '[]'::jsonb) FROM (
        SELECT
          COALESCE(kv.ten_khu_vuc, '—') AS ten,
          count(*)::bigint AS tong,
          count(*) FILTER (WHERE o.is_tuan_thu = true)::bigint AS dat,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        JOIN _vst_sess s ON o.session_id = s.id
        LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
        GROUP BY kv.ten_khu_vuc
      ) t
    ),
    'moment_missed', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT mr.moment_label AS ten, count(*) FILTER (WHERE mr.is_tuan_thu = false)::bigint AS so_lan
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
      ) t
    ),
    'glove_abuse_by_moment', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.so_lan DESC), '[]'::jsonb) FROM (
        SELECT mr.moment_label AS ten, count(*) FILTER (WHERE mr.co_deo_gang = true AND mr.is_tuan_thu = false)::bigint AS so_lan
        FROM _vst_moment_rows mr
        GROUP BY mr.moment_label
      ) t
    ),
    'trend', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ky), '[]'::jsonb) FROM (
        SELECT
          to_char(o.ngay_giam_sat, 'YYYY-MM') AS ky,
          to_char(o.ngay_giam_sat, 'MM/YYYY') AS label,
          count(*)::bigint AS so_co_hoi,
          ROUND(count(*) FILTER (WHERE o.is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) AS ty_le
        FROM _vst_opp o
        GROUP BY 1, 2
      ) t
    ),
    'error_breakdown', (
      SELECT jsonb_build_object(
        'loi_ky_thuat', count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = false),
        'loi_thoi_gian', count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = false),
        'lam_dung_gang', count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false),
        'ty_le_lam_dung_gang', COALESCE(ROUND(count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = false), 0), 1), 0),
        'ty_le_dung_ky_thuat', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1),
        'ty_le_du_thoi_gian', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1)
      ) FROM _vst_opp
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
