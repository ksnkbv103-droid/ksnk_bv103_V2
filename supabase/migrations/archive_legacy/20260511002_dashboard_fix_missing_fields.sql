-- Migration: Sửa lỗi mất số liệu và hoàn thiện logic phân loại nguồn giám sát
-- Đảm bảo trả về đầy đủ các trường dữ liệu cho cả Compliance và VST

CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v2"(
  "p_tu_ngay" "date", 
  "p_den_ngay" "date", 
  "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], 
  "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[], 
  "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[], 
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL::"uuid"[], 
  "p_khu_vuc_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_summary JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu JSONB;
  v_trend JSONB;
  v_violations JSONB;
  v_supervision_sources JSONB;
  v_participation JSONB;
BEGIN
  -- CTE lọc dữ liệu
  WITH filtered_sessions AS (
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.nguoi_giam_sat_id,
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
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_khoi_ids IS NULL OR k_target.khoi_id = ANY(p_khoi_ids))
  ),
  final_sessions AS (
    SELECT * FROM filtered_sessions
    WHERE (p_supervision_type = 'ALL' OR calc_supervision_type = p_supervision_type)
  )
  SELECT jsonb_build_object(
    'tong_phien', COUNT(DISTINCT s.id),
    'tong_quan_sat', COUNT(r.id),
    'tong_vi_pham', COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu', CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END
  ) INTO v_summary FROM final_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_by_nghe FROM (
    SELECT COALESCE(n.ten_nghe_nghiep, 'Không rõ') as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s LEFT JOIN public.mdm_nghe_nghiep n ON s.nghe_nghiep_id = n.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_by_khu FROM (
    SELECT COALESCE(kv.ten_khu_vuc, 'Không rõ') as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham, COUNT(r.id) as tong_quan_sat, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN final_sessions s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  WITH sources AS (
    SELECT calc_source_name as ten, count(DISTINCT id) as so_phien FROM final_sessions GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  WITH part AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN final_sessions s ON k.id = s.khoa_id AND s.calc_supervision_type = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM part;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'by_nghe_nghiep', COALESCE(v_by_nghe, '[]'::jsonb),
    'by_khu_vuc', COALESCE(v_by_khu, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb),
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb),
    'participation', COALESCE(v_participation, '[]'::jsonb)
  );
END;
$$;

-- Cập nhật rpc_get_vst_dashboard_v2
CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", 
  "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[],
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
  final_sessions AS (
    SELECT * FROM base_sessions
    WHERE (p_supervision_type = 'ALL' OR calc_supervision_type = p_supervision_type)
  )
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_co_hoi', count(o.id),
    'da_tuan_thu', count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')),
    'bo_sot', count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'),
    'ty_le_tuan_thu', CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END
  ) INTO v_kpis FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT ky, ky as label, so_co_hoi, CASE WHEN so_co_hoi > 0 THEN ROUND((dat * 100.0) / so_co_hoi, 1) ELSE 0 END as ty_le
    FROM (
      SELECT CASE WHEN p_trend_type = 'day' THEN TO_CHAR(s.ngay_giam_sat, 'YYYY-MM-DD') ELSE TO_CHAR(s.ngay_giam_sat, 'YYYY-MM') END as ky, count(o.id) as so_co_hoi, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
      FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 1
    ) sub
  ) t;

  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_by_nghe FROM (
    SELECT COALESCE(o.nghe_nghiep, 'Không rõ') as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_moment_missed FROM (
    SELECT COALESCE(o.thoi_diem, 'Không rõ') as ten, count(o.id) as so_lan
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_glove_abuse_by_moment FROM (
    SELECT COALESCE(o.thoi_diem, 'Không rõ') as ten, count(o.id) as so_lan
    FROM final_sessions s JOIN public.fact_giam_sat_vst o ON s.id = o.session_id WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_build_object(
    'loi_ky_thuat', count(o.id) FILTER (WHERE o.dung_ky_thuat = false),
    'loi_thoi_gian', count(o.id) FILTER (WHERE o.du_thoi_gian = false),
    'lam_dung_gang', count(o.id) FILTER (WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'),
    'ty_le_lam_dung_gang', CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE o.co_deo_gang = true AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot') * 100.0) / count(o.id), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.dung_ky_thuat = true) * 100.0) / count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.du_thoi_gian = true) * 100.0) / count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END
  ) INTO v_error_breakdown FROM final_sessions s LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id;

  WITH sources AS (
    SELECT calc_source_name as ten, count(DISTINCT id) as so_phien FROM final_sessions GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  WITH part AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN final_sessions s ON k.id = s.khoa_id AND s.calc_supervision_type = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM part;

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
