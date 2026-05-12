-- Delta (idempotent): đồng bộ phân loại hanh_dong tuân thủ với app (translate đ→d + gộp khoảng trắng + unaccent).
-- Dùng khi DB đã apply 20260511111 trước khi logic is_tuan_thu được cập nhật trong repo.

CREATE OR REPLACE FUNCTION public.rpc_get_vst_moment_table_only(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_trend_type text DEFAULT 'month',
  p_supervision_type text DEFAULT 'ALL'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  CREATE TEMP TABLE _vst_sess_m ON COMMIT DROP AS
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
           ELSE 'CHEO'
         END AS stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  IF p_supervision_type IS NOT NULL AND p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess_m WHERE stype <> p_supervision_type;
  END IF;

  CREATE TEMP TABLE _vst_opp_m ON COMMIT DROP AS
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
  JOIN _vst_sess_m s ON d.session_id = s.id
  WHERE (p_nghe_nghiep_ids IS NULL OR EXISTS (
    SELECT 1
    FROM public.dm_nghe_nghiep nn
    WHERE nn.id = ANY(p_nghe_nghiep_ids)
      AND nn.is_active IS NOT FALSE
      AND d.nghe_nghiep IS NOT NULL
      AND btrim(d.nghe_nghiep) <> ''
      AND nn.ten_nghe_nghiep = d.nghe_nghiep
  ));

  CREATE TEMP TABLE _vst_moment_rows_m ON COMMIT DROP AS
  SELECT * FROM (
    SELECT d.session_id,
           d.is_tuan_thu,
           d.dung_ky_thuat,
           d.du_thoi_gian,
           d.co_deo_gang,
           d.ngay_giam_sat,
           btrim(m.moment_part, E' \t\n\r') AS moment_label
    FROM _vst_opp_m d
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE btrim(m.moment_part, E' \t\n\r') <> ''

    UNION ALL

    SELECT d.session_id,
           d.is_tuan_thu,
           d.dung_ky_thuat,
           d.du_thoi_gian,
           d.co_deo_gang,
           d.ngay_giam_sat,
           '— Chưa ghi thời điểm trong phiếu'::text AS moment_label
    FROM _vst_opp_m d
    WHERE NOT EXISTS (
      SELECT 1
      FROM regexp_split_to_table(
        regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
        E'\\s*,\\s*'
      ) AS mp(part)
      WHERE btrim(mp.part, E' \t\n\r') <> ''
    )
  ) _mr;

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
          WHEN '— Chưa ghi thời điểm trong phiếu' THEN 6
          ELSE 99
        END
      ) AS sort_ord
    FROM _vst_moment_rows_m mr
    GROUP BY mr.moment_label
  ),
  tot AS (
    SELECT
      COALESCE(SUM(n_bo_sot), 0)::numeric AS t_bo_sot,
      COALESCE(SUM(n_dat), 0)::numeric AS t_dat
    FROM agg
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'ten', a.moment_label,
          'tong', a.cnt_all,
          'n_bo_sot', a.n_bo_sot,
          'n_dat', a.n_dat,
          'ty_le_bo_sot', COALESCE(ROUND(a.n_bo_sot * 100.0 / NULLIF(t.t_bo_sot, 0), 1), 0),
          'ty_le_tuan_thu', COALESCE(ROUND(a.n_dat * 100.0 / NULLIF(t.t_dat, 0), 1), 0)
        )
        ORDER BY a.sort_ord
      )
      FROM agg a
      CROSS JOIN tot t
    ),
    '[]'::jsonb
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_vst_moment_table_only(
  date, date, uuid[], uuid[], uuid[], uuid[], text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.rpc_get_vst_moment_table_only(
  date, date, uuid[], uuid[], uuid[], uuid[], text, text
) TO service_role;
