-- Migration: Siêu đơn giản và bền bỉ - Khôi phục số liệu Dashboard
-- Loại bỏ các join phức tạp có thể gây mất dòng dữ liệu nếu thiếu thông tin nhân sự

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
  v_summary JSONB; v_by_khoa JSONB; v_by_nghe JSONB; v_by_khu JSONB;
  v_trend JSONB; v_violations JSONB; v_sources JSONB; v_part JSONB;
BEGIN
  WITH raw_sessions AS (
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.loai_bang_kiem,
           -- Logic nguồn: Ưu tiên mã KSNK hoặc tên có Kiểm soát nhiễm khuẩn
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as src_type,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'Khoa KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as src_name,
           k_target.khoi_id as target_khoi_id
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
  ),
  filtered AS (
    SELECT * FROM raw_sessions
    WHERE (p_supervision_type = 'ALL' OR src_type = p_supervision_type)
      AND (p_bang_kiem_mas IS NULL OR loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR target_khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY(p_khu_vuc_ids))
  )
  SELECT jsonb_build_object(
    'tong_phien', COUNT(DISTINCT s.id), 'tong_quan_sat', COUNT(r.id),
    'tong_vi_pham', COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu', CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END
  ) INTO v_summary FROM filtered s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 2 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY MIN(s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 15
  ) t;

  SELECT jsonb_agg(jsonb_build_object('ten', src_name, 'so_phien', count(DISTINCT id))) INTO v_sources FROM filtered GROUP BY src_name;

  SELECT jsonb_agg(jsonb_build_object('id', k.id, 'ten', k.ten_khoa, 'so_phien', count(DISTINCT s.id))) INTO v_part 
  FROM public.dm_khoa_phong k LEFT JOIN filtered s ON k.id = s.khoa_id AND s.src_type = 'TU_GIAM_SAT'
  WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids)) AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids)) GROUP BY 1, 2;

  RETURN jsonb_build_object('summary', v_summary, 'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb), 'trend', COALESCE(v_trend, '[]'::jsonb), 'violations', COALESCE(v_violations, '[]'::jsonb), 'supervision_sources', COALESCE(v_sources, '[]'::jsonb), 'participation', COALESCE(v_part, '[]'::jsonb));
END;
$$;

-- VST RPC
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
  v_kpis JSONB; v_trend JSONB; v_by_khoa JSONB; v_by_nghe JSONB; v_sources JSONB; v_part JSONB; v_err JSONB; v_missed JSONB;
BEGIN
  WITH filtered_sessions AS (
    SELECT s.id, s.khoa_id, s.ngay_giam_sat,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as src_type,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'Khoa KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as src_name,
           k_target.khoi_id as target_khoi_id
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_target.khoi_id = ANY(p_khoi_ids))
      AND (p_supervision_type = 'ALL' OR (
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END = p_supervision_type))
  ),
  observations AS (
    SELECT o.*, s.ngay_giam_sat, s.src_type, s.src_name, s.khoa_id as s_khoa_id
    FROM public.fact_giam_sat_vst o JOIN filtered_sessions s ON o.session_id = s.id
    WHERE (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY(p_khu_vuc_ids))
  )
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT session_id), 'tong_co_hoi', count(id),
    'da_tuan_thu', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')),
    'bo_sot', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) = 'bo sot'),
    'ty_le_tuan_thu', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END
  ) INTO v_kpis FROM observations;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT label, count(id) as so_co_hoi, CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM (SELECT TO_CHAR(ngay_giam_sat, 'MM/YY') as label, id, hanh_dong FROM observations) sub GROUP BY 1 ORDER BY MIN(label)
  ) t;

  SELECT jsonb_agg(jsonb_build_object('ten', src_name, 'so_phien', count(DISTINCT session_id))) INTO v_sources FROM observations GROUP BY src_name;

  RETURN jsonb_build_object('kpis', v_kpis, 'trend', COALESCE(v_trend, '[]'::jsonb), 'supervision_sources', COALESCE(v_sources, '[]'::jsonb));
END;
$$;
