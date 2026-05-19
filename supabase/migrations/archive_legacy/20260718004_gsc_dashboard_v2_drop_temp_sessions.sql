-- GSC dashboard v2: DROP temp table trước khi tạo — tránh lỗi khi multi_v1 gọi v2 lặp trong cùng transaction.
-- Lỗi app: relation "_gsc_sessions" already exists

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v2(
  p_tu_ngay date,
  p_den_ngay date,
  p_bang_kiem_mas text[] DEFAULT NULL,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  DROP TABLE IF EXISTS _gsc_sessions;

  CREATE TEMP TABLE _gsc_sessions ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        p_bang_kiem_mas IS NULL
        OR bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_quan_sat', count(r.id),
    'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu',
    CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
  )
  INTO v_sum
  FROM _gsc_sessions s
  LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
           count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
    GROUP BY 1
  ) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.fact_giam_sat_chung_results r
    JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
    JOIN _gsc_sessions s ON r.session_id = s.id
    GROUP BY 1, 2
    HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
    ORDER BY 3 DESC LIMIT 20
  ) t;

  SELECT jsonb_agg(t) INTO v_source FROM (
    SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions
    UNION ALL
    SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions
    UNION ALL
    SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions
  ) t;

  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN _gsc_sessions s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
    GROUP BY 1, 2 ORDER BY 3 ASC, 2 ASC
  ) t;

  RETURN jsonb_build_object(
    'summary', v_sum,
    'by_khoa', coalesce(v_khoa, '[]'::jsonb),
    'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
    'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
    'trend', coalesce(v_trend, '[]'::jsonb),
    'violations', coalesce(v_violation, '[]'::jsonb),
    'supervision_sources', coalesce(v_source, '[]'::jsonb),
    'participation', coalesce(v_part, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_multi_v1(
  p_tu_ngay date,
  p_den_ngay date,
  p_bang_kiem_mas text[],
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
BEGIN
  IF p_bang_kiem_mas IS NULL OR array_length(p_bang_kiem_mas, 1) IS NULL THEN
    RETURN '{}'::json;
  END IF;

  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    v_ma_bk := p_bang_kiem_mas[1];
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    RETURN jsonb_build_object(v_ma_bk, v_sub_res);
  END IF;

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    v_result := v_result || jsonb_build_object(v_ma_bk, coalesce(v_sub_res, '{}'::jsonb));
  END LOOP;

  RETURN v_result;
END;
$$;
