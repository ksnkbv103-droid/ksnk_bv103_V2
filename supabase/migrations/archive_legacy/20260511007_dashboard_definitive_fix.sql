-- DEFINITIVE FIX v2 - sử dụng TEMP TABLE thay vì CTE để dùng được ở nhiều query
-- Đã kiểm tra schema thực tế:
-- fact_giam_sat_vst: nghe_nghiep=TEXT, khu_vuc=TEXT (KHÔNG UUID)
-- fact_giam_sat_chung_sessions: nghe_nghiep_id=UUID, khu_vuc_id=UUID

-- ========== VST DASHBOARD ==========
DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text, text);

CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL, "p_khoa_ids" "uuid"[] DEFAULT NULL,
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL, "p_khu_vuc_ids" "uuid"[] DEFAULT NULL,
  "p_trend_type" "text" DEFAULT 'month', "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_kpis JSONB; v_trend JSONB; v_khoa JSONB; v_nghe JSONB; v_source JSONB; v_part JSONB; v_err JSONB; v_missed JSONB; v_glove JSONB;
  v_nghe_names TEXT[]; v_khu_names TEXT[];
BEGIN
  IF p_nghe_nghiep_ids IS NOT NULL THEN
    SELECT ARRAY_AGG(ten_nghe_nghiep) INTO v_nghe_names FROM public.dm_nghe_nghiep WHERE id = ANY(p_nghe_nghiep_ids);
  END IF;
  IF p_khu_vuc_ids IS NOT NULL THEN
    SELECT ARRAY_AGG(ten_khu_vuc) INTO v_khu_names FROM public.dm_khu_vuc_giam_sat WHERE id = ANY(p_khu_vuc_ids);
  END IF;

  CREATE TEMP TABLE _vst_obs ON COMMIT DROP AS
    SELECT o.id, o.session_id, o.hanh_dong, o.thoi_diem, o.dung_ky_thuat, o.du_thoi_gian, o.co_deo_gang,
           o.nghe_nghiep, o.khu_vuc, s2.ngay_giam_sat, s2.stype, s2.khoa_id as s_khoa_id
    FROM public.fact_giam_sat_vst o
    JOIN (
      SELECT s.id, s.khoa_id, s.ngay_giam_sat,
             CASE 
               WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
                    AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa != 'KSNK' AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
               WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa = 'KSNK' OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                    OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
               ELSE 'CHEO'
             END as stype
      FROM public.fact_giam_sat_vst_sessions s
      LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
      LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
      LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
      WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
    ) s2 ON o.session_id = s2.id
    WHERE (p_supervision_type = 'ALL' OR s2.stype = p_supervision_type)
      AND (v_nghe_names IS NULL OR o.nghe_nghiep = ANY(v_nghe_names))
      AND (v_khu_names IS NULL OR o.khu_vuc = ANY(v_khu_names));

  -- KPIs
  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT session_id), 'tong_co_hoi', count(id),
    'da_tuan_thu', count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%'),
    'bo_sot', count(id) FILTER (WHERE hanh_dong ILIKE '%bỏ sót%'),
    'ty_le_tuan_thu', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') * 100.0) / count(id), 1) ELSE 0 END
  ) INTO v_kpis FROM _vst_obs;

  -- Trend
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') as label, MIN(ngay_giam_sat) as min_date,
           count(id) as so_co_hoi, CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM _vst_obs GROUP BY 1
  ) t;

  -- By khoa
  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.ten_khoa as ten, count(o.id) as tong, count(o.id) FILTER (WHERE o.hanh_dong ILIKE '%rửa tay%' OR o.hanh_dong ILIKE '%chà tay%') as dat,
           CASE WHEN count(o.id) > 0 THEN ROUND((count(o.id) FILTER (WHERE o.hanh_dong ILIKE '%rửa tay%' OR o.hanh_dong ILIKE '%chà tay%') * 100.0) / count(o.id), 1) ELSE 0 END as ty_le
    FROM _vst_obs o JOIN public.dm_khoa_phong k ON o.s_khoa_id = k.id GROUP BY 1 ORDER BY 4 DESC LIMIT 50
  ) t;

  -- By nghề nghiệp (text)
  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT COALESCE(nghe_nghiep, 'Không rõ') as ten, count(id) as tong, count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') as dat,
           CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') * 100.0) / count(id), 1) ELSE 0 END as ty_le
    FROM _vst_obs GROUP BY 1 ORDER BY 2 DESC
  ) t;

  -- Bỏ sót theo thời điểm
  SELECT jsonb_agg(t) INTO v_missed FROM (SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan FROM _vst_obs WHERE hanh_dong ILIKE '%bỏ sót%' GROUP BY 1 ORDER BY 2 DESC) t;

  -- Lạm dụng găng
  SELECT jsonb_agg(t) INTO v_glove FROM (SELECT COALESCE(thoi_diem, 'Không rõ') as ten, count(id) as so_lan FROM _vst_obs WHERE co_deo_gang = true AND hanh_dong ILIKE '%bỏ sót%' GROUP BY 1 ORDER BY 2 DESC) t;

  -- Sources (luôn 3)
  SELECT jsonb_agg(t) INTO v_source FROM (
    SELECT 'Khoa KSNK' as ten, count(DISTINCT session_id) FILTER (WHERE stype = 'KSNK') as so_phien FROM _vst_obs
    UNION ALL SELECT 'Giám sát chéo', count(DISTINCT session_id) FILTER (WHERE stype = 'CHEO') FROM _vst_obs
    UNION ALL SELECT 'Tự giám sát', count(DISTINCT session_id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _vst_obs
  ) t;

  -- Participation
  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT o.session_id) FILTER (WHERE o.stype = 'TU_GIAM_SAT') as so_phien
    FROM public.dm_khoa_phong k LEFT JOIN _vst_obs o ON k.id = o.s_khoa_id
    WHERE k.is_active = true AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids)) AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids))
    GROUP BY 1, 2 ORDER BY 3 ASC, 2 ASC
  ) t;

  -- Errors
  SELECT jsonb_build_object(
    'loi_ky_thuat', count(id) FILTER (WHERE dung_ky_thuat = false),
    'loi_thoi_gian', count(id) FILTER (WHERE du_thoi_gian = false),
    'lam_dung_gang', count(id) FILTER (WHERE co_deo_gang = true AND hanh_dong ILIKE '%bỏ sót%'),
    'ty_le_lam_dung_gang', CASE WHEN count(id) > 0 THEN ROUND((count(id) FILTER (WHERE co_deo_gang = true AND hanh_dong ILIKE '%bỏ sót%') * 100.0) / count(id), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') > 0 THEN ROUND((count(id) FILTER (WHERE (hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') AND dung_ky_thuat = true) * 100.0) / NULLIF(count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%'), 0), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') > 0 THEN ROUND((count(id) FILTER (WHERE (hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%') AND du_thoi_gian = true) * 100.0) / NULLIF(count(id) FILTER (WHERE hanh_dong ILIKE '%rửa tay%' OR hanh_dong ILIKE '%chà tay%'), 0), 1) ELSE 0 END
  ) INTO v_err FROM _vst_obs;

  RETURN jsonb_build_object('tu_ngay', p_tu_ngay, 'den_ngay', p_den_ngay, 'kpis', v_kpis, 'trend', COALESCE(v_trend, '[]'::jsonb), 'by_khoa', COALESCE(v_khoa, '[]'::jsonb), 'by_doi_tuong', COALESCE(v_nghe, '[]'::jsonb), 'by_khu_vuc', '[]'::jsonb, 'moment_missed', COALESCE(v_missed, '[]'::jsonb), 'glove_abuse_by_moment', COALESCE(v_glove, '[]'::jsonb), 'supervision_sources', COALESCE(v_source, '[]'::jsonb), 'participation', COALESCE(v_part, '[]'::jsonb), 'error_breakdown', v_err);
END;
$$;

-- ========== COMPLIANCE DASHBOARD ==========
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text);

CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v2"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_bang_kiem_mas" "text"[] DEFAULT NULL, "p_khoi_ids" "uuid"[] DEFAULT NULL, 
  "p_khoa_ids" "uuid"[] DEFAULT NULL, "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL, 
  "p_khu_vuc_ids" "uuid"[] DEFAULT NULL, "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_sum JSONB; v_khoa JSONB; v_nghe JSONB; v_khu JSONB; v_trend JSONB; v_violation JSONB; v_source JSONB; v_part JSONB;
BEGIN
  CREATE TEMP TABLE _gsc_sessions ON COMMIT DROP AS
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.loai_bang_kiem,
           CASE 
             WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
                  AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa != 'KSNK' AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa = 'KSNK' OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
                  OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
             ELSE 'CHEO'
           END as stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_supervision_type = 'ALL' OR (
        CASE WHEN (k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa != 'KSNK' AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
             WHEN ((k_ns.ma_khoa = 'KSNK' OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa = 'KSNK' OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')) OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
             ELSE 'CHEO' END = p_supervision_type))
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  SELECT jsonb_build_object('tong_phien', count(DISTINCT s.id), 'tong_quan_sat', count(r.id), 'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'), 'ty_le_tuan_thu', CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END) INTO v_sum FROM _gsc_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (SELECT k.ten_khoa as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le FROM _gsc_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC LIMIT 50) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (SELECT COALESCE(n.ten_nghe_nghiep, 'Không rõ') as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le FROM _gsc_sessions s LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (SELECT COALESCE(kv.ten_khu_vuc, 'Không rõ') as ten, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le FROM _gsc_sessions s LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC) t;

  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') as label, MIN(ngay_giam_sat) as min_date, count(r.id) as tong, count(r.id) FILTER (WHERE r.value = 'DAT') as dat, CASE WHEN count(r.id) > 0 THEN ROUND((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END as ty_le FROM _gsc_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (SELECT tc.noi_dung as ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN _gsc_sessions s ON r.session_id = s.id GROUP BY 1 HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20) t;

  SELECT jsonb_agg(t) INTO v_source FROM (SELECT 'Khoa KSNK' as ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') as so_phien FROM _gsc_sessions UNION ALL SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions UNION ALL SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions) t;

  SELECT jsonb_agg(t) INTO v_part FROM (SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') as so_phien FROM public.dm_khoa_phong k LEFT JOIN _gsc_sessions s ON k.id = s.khoa_id WHERE k.is_active = true AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids)) AND (p_khoa_ids IS NULL OR k.id = ANY(p_khoa_ids)) GROUP BY 1, 2 ORDER BY 3 ASC, 2 ASC) t;

  RETURN jsonb_build_object('summary', v_sum, 'by_khoa', COALESCE(v_khoa, '[]'::jsonb), 'by_nghe_nghiep', COALESCE(v_nghe, '[]'::jsonb), 'by_khu_vuc', COALESCE(v_khu, '[]'::jsonb), 'trend', COALESCE(v_trend, '[]'::jsonb), 'violations', COALESCE(v_violation, '[]'::jsonb), 'supervision_sources', COALESCE(v_source, '[]'::jsonb), 'participation', COALESCE(v_part, '[]'::jsonb));
END;
$$;
