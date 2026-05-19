-- Migration: Fix rpc_get_vst_dashboard_v2 để hỗ trợ đầy đủ bộ lọc
-- Thêm: p_nghe_nghiep_ids, p_khu_vuc_ids và logic lọc tương ứng

CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", 
  "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_trend_type" "text" DEFAULT 'month',
  "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_kpis JSONB;
  v_trend JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu_vuc JSONB;
  v_moment_missed JSONB;
  v_glove_abuse_by_moment JSONB;
  v_supervision_sources JSONB;
  v_participation JSONB;
  v_error_breakdown JSONB;
BEGIN
  WITH base_sessions AS (
    SELECT s.id, s.khoa_id, s.ngay_giam_sat, s.nguoi_giam_sat_id,
           CASE 
             WHEN (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND NOT (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK') THEN 'KSNK'
             WHEN ((k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK'))
                  OR (NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as calc_supervision_type,
           CASE 
             WHEN (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND NOT (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK') THEN 'Khoa KSNK'
             WHEN ((k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND (k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_target.ma_khoa = 'KSNK'))
                  OR (NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK') 
                  AND s.khoa_id = ns.khoa_id) THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as calc_source_name
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_target.khoi_id = ANY(p_khoi_ids))
  ),
  -- Lọc Observations chi tiết theo Đối tượng / Khu vực
  filtered_observations AS (
    SELECT o.*, s.calc_supervision_type, s.calc_source_name, s.ngay_giam_sat, s.khoa_id as s_khoa_id
    FROM public.fact_giam_sat_vst o
    JOIN base_sessions s ON o.session_id = s.id
    LEFT JOIN public.mdm_nghe_nghiep n ON o.nghe_nghiep_id = n.id
    WHERE (p_supervision_type = 'ALL' OR s.calc_supervision_type = p_supervision_type)
      AND (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY(p_khu_vuc_ids))
  )
  -- 1. KPI
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT session_id),
    'tong_co_hoi', count(id),
    'da_tuan_thu', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')),
    'bo_sot', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) = 'bo sot'),
    'ty_le_tuan_thu', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END
  ) INTO v_kpis FROM filtered_observations;

  -- 2. Supervision Sources
  WITH sources AS (
    SELECT calc_source_name as ten, count(DISTINCT session_id) as so_phien FROM filtered_observations GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- 3. Participation
  WITH part AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.session_id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN filtered_observations s ON k.id = s.s_khoa_id AND s.calc_supervision_type = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM part;

  -- 4. Trend
  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT ky, ky as label, count(id) as so_co_hoi, CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM (
      SELECT CASE WHEN p_trend_type = 'day' THEN TO_CHAR(ngay_giam_sat, 'YYYY-MM-DD') ELSE TO_CHAR(ngay_giam_sat, 'YYYY-MM') END as ky, id, hanh_dong
      FROM filtered_observations
    ) sub GROUP BY 1 ORDER BY 1
  ) t;

  -- 5. By Khoa
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM filtered_observations o JOIN public.dm_khoa_phong k ON o.s_khoa_id = k.id GROUP BY 1 ORDER BY 2 DESC
  ) t;

  -- 6. By Nghe
  SELECT jsonb_agg(t) INTO v_by_nghe FROM (
    SELECT COALESCE(o.nghe_nghiep, 'Không rõ') as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM filtered_observations o GROUP BY 1 ORDER BY 2 DESC
  ) t;

  -- 7. Error Breakdown
  SELECT jsonb_build_object(
    'loi_ky_thuat', count(id) FILTER (WHERE dung_ky_thuat = false),
    'loi_thoi_gian', count(id) FILTER (WHERE du_thoi_gian = false),
    'lam_dung_gang', count(id) FILTER (WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot'),
    'ty_le_lam_dung_gang', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot') * 100.0) / count(id), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND dung_ky_thuat = true) * 100.0) / count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND du_thoi_gian = true) * 100.0) / count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END
  ) INTO v_error_breakdown FROM filtered_observations;

  -- 8. Moment Missed
  SELECT jsonb_agg(t) INTO v_moment_missed FROM (
    SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan
    FROM filtered_observations WHERE LOWER(UNACCENT(hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  -- 9. Glove Abuse
  SELECT jsonb_agg(t) INTO v_glove_abuse_by_moment FROM (
    SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan
    FROM filtered_observations WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  RETURN jsonb_build_object(
    'tu_ngay', p_tu_ngay, 'den_ngay', p_den_ngay, 'kpis', v_kpis, 
    'trend', COALESCE(v_trend, '[]'::jsonb), 
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb), 
    'by_doi_tuong', COALESCE(v_by_nghe, '[]'::jsonb), 
    'by_khu_vuc', '[]'::jsonb, 
    'moment_missed', COALESCE(v_moment_missed, '[]'::jsonb), 
    'glove_abuse_by_moment', COALESCE(v_glove_abuse_by_moment, '[]'::jsonb), 
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb), 
    'participation', COALESCE(v_participation, '[]'::jsonb), 
    'error_breakdown', v_error_breakdown
  );
END;
$$;
