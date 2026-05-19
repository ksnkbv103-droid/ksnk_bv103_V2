-- Migration: Phục hồi toàn bộ dữ liệu Dashboard và tối ưu hóa logic lọc
-- Đảm bảo không bị mất dòng dữ liệu và trả về ĐẦY ĐỦ các trường thông tin cho UI

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
  v_res JSONB; v_sum JSONB; v_khoa JSONB; v_nghe JSONB; v_khu JSONB; v_trend JSONB; v_violation JSONB; v_source JSONB; v_part JSONB;
BEGIN
  WITH base AS (
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.loai_bang_kiem,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as stype,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'Khoa KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as sname,
           k_target.khoi_id
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
  ),
  filtered AS (
    SELECT * FROM base 
    WHERE (p_supervision_type = 'ALL' OR stype = p_supervision_type)
      AND (p_bang_kiem_mas IS NULL OR loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY(p_khu_vuc_ids))
  )
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id), 'tong_quan_sat', count(r.id),
    'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu', CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
  ) INTO v_sum FROM filtered s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.ten_khoa as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 2 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT COALESCE(n.ten_nghe_nghiep, 'Không rõ') as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s LEFT JOIN public.mdm_nghe_nghiep n ON s.nghe_nghiep_id = n.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT COALESCE(kv.ten_khu_vuc, 'Không rõ') as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') as label, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le
    FROM filtered s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1, date_trunc('month', ngay_giam_sat) ORDER BY date_trunc('month', ngay_giam_sat)
  ) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.noi_dung as ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered s ON r.session_id = s.id
    GROUP BY 1 HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  SELECT jsonb_agg(t) INTO v_source FROM (SELECT sname as ten, count(DISTINCT id) as so_phien FROM filtered GROUP BY 1) t;

  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k LEFT JOIN filtered s ON k.id = s.khoa_id AND s.stype = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids)) AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  ) t;

  RETURN jsonb_build_object('summary', v_sum, 'by_khoa', COALESCE(v_khoa, '[]'::jsonb), 'by_nghe_nghiep', COALESCE(v_nghe, '[]'::jsonb), 'by_khu_vuc', COALESCE(v_khu, '[]'::jsonb), 'trend', COALESCE(v_trend, '[]'::jsonb), 'violations', COALESCE(v_violation, '[]'::jsonb), 'supervision_sources', COALESCE(v_source, '[]'::jsonb), 'participation', COALESCE(v_part, '[]'::jsonb));
END;
$$;

-- VST RPC FULL RESTORE
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
  v_kpis JSONB; v_trend JSONB; v_khoa JSONB; v_nghe JSONB; v_khu JSONB; v_missed JSONB; v_glove JSONB; v_source JSONB; v_part JSONB; v_err JSONB;
BEGIN
  WITH base AS (
    SELECT s.id, s.khoa_id, s.ngay_giam_sat,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as stype,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND k_target.ma_khoa != 'KSNK' AND k_target.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%' THEN 'Khoa KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_target.ma_khoa = 'KSNK' OR k_target.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
             ELSE 'Giám sát chéo'
           END as sname,
           k_target.khoi_id
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_target ON s.khoa_id = k_target.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
  ),
  filtered AS (
    SELECT * FROM base
    WHERE (p_supervision_type = 'ALL' OR stype = p_supervision_type)
      AND (p_khoa_ids IS NULL OR khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR khoi_id = ANY(p_khoi_ids))
  ),
  obs AS (
    SELECT o.*, s.ngay_giam_sat, s.stype, s.sname, s.khoa_id as s_khoa_id
    FROM public.fact_giam_sat_vst o JOIN filtered s ON o.session_id = s.id
    WHERE (p_nghe_nghiep_ids IS NULL OR o.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR o.khu_vuc_id = ANY(p_khu_vuc_ids))
  )
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT session_id), 'tong_co_hoi', count(id),
    'da_tuan_thu', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')),
    'bo_sot', count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) = 'bo sot'),
    'ty_le_tuan_thu', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END
  ) INTO v_kpis FROM obs;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT label, count(id) as so_co_hoi, CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM (SELECT TO_CHAR(ngay_giam_sat, 'MM/YY') as label, id, hanh_dong, ngay_giam_sat FROM obs) sub GROUP BY 1, date_trunc('month', ngay_giam_sat) ORDER BY date_trunc('month', ngay_giam_sat)
  ) t;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.ten_khoa as ten, count(o.id) as tong, count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM obs o JOIN public.dm_khoa_phong k ON o.s_khoa_id = k.id GROUP BY 1 ORDER BY 2 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT COALESCE(nghe_nghiep, 'Không rõ') as ten, count(id) as tong, count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat, CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM obs GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_missed FROM (
    SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan FROM obs WHERE LOWER(UNACCENT(hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_glove FROM (
    SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan FROM obs WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot' GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_source FROM (SELECT sname as ten, count(DISTINCT session_id) as so_phien FROM obs GROUP BY 1) t;

  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.session_id) as so_phien
    FROM public.dm_khoa_phong k LEFT JOIN obs s ON k.id = s.s_khoa_id AND s.stype = 'TU_GIAM_SAT'
    WHERE (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids)) AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2
  ) t;

  SELECT jsonb_build_object(
    'loi_ky_thuat', count(id) FILTER (WHERE dung_ky_thuat = false), 'loi_thoi_gian', count(id) FILTER (WHERE du_thoi_gian = false),
    'lam_dung_gang', count(id) FILTER (WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot'),
    'ty_le_lam_dung_gang', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE co_deo_gang = true AND LOWER(UNACCENT(hanh_dong)) = 'bo sot') * 100.0) / count(id), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND dung_ky_thuat = true) * 100.0) / count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) > 0 THEN ROUND((count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND du_thoi_gian = true) * 100.0) / count(id) FILTER (WHERE LOWER(UNACCENT(hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')), 1) ELSE 0 END
  ) INTO v_err FROM obs;

  RETURN jsonb_build_object('tu_ngay', p_tu_ngay, 'den_ngay', p_den_ngay, 'kpis', v_kpis, 'trend', COALESCE(v_trend, '[]'::jsonb), 'by_khoa', COALESCE(v_khoa, '[]'::jsonb), 'by_doi_tuong', COALESCE(v_nghe, '[]'::jsonb), 'by_khu_vuc', '[]'::jsonb, 'moment_missed', COALESCE(v_missed, '[]'::jsonb), 'glove_abuse_by_moment', COALESCE(v_glove, '[]'::jsonb), 'supervision_sources', COALESCE(v_source, '[]'::jsonb), 'participation', COALESCE(v_part, '[]'::jsonb), 'error_breakdown', v_err);
END;
$$;
