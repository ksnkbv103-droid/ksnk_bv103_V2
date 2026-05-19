-- Nâng cấp RPC Dashboard Vệ Sinh Tay (V2)
-- Hỗ trợ phân tích đa chiều: Trend (Ngày/Tuần/Tháng), Lạm dụng găng theo thời điểm, Hiệu suất thực sự (Đúng kỹ thuật/Đủ thời gian trên số ca tuân thủ)

CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", 
  "p_den_ngay" "date", 
  "p_khoa_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "p_trend_type" "text" DEFAULT 'month' -- 'day', 'week', 'month'
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_kpis JSONB;
  v_trend JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_by_khu_vuc JSONB;
  v_moment_missed JSONB;
  v_moment_good JSONB;
  v_error_breakdown JSONB;
  v_glove_abuse_by_moment JSONB;
BEGIN
  -- 1. Tính KPI tổng quát
  WITH stats AS (
    SELECT 
      count(DISTINCT s.id) as tong_phien,
      count(o.id) as tong_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as da_tuan_thu,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) = 'bo sot') as bo_sot
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_co_hoi', tong_co_hoi,
    'da_tuan_thu', da_tuan_thu,
    'bo_sot', bo_sot,
    'ty_le_tuan_thu', CASE WHEN tong_co_hoi > 0 THEN ROUND((da_tuan_thu * 100.0) / tong_co_hoi, 1) ELSE 0 END
  ) INTO v_kpis FROM stats;

  -- 2. Thống kê xu hướng (Trend)
  WITH trend_stats AS (
    SELECT 
      CASE 
        WHEN p_trend_type = 'day' THEN TO_CHAR(date_trunc('day', s.ngay_giam_sat), 'YYYY-MM-DD')
        WHEN p_trend_type = 'week' THEN TO_CHAR(date_trunc('week', s.ngay_giam_sat), 'IYYY-IW')
        ELSE TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM')
      END as ky,
      CASE 
        WHEN p_trend_type = 'day' THEN TO_CHAR(date_trunc('day', s.ngay_giam_sat), 'DD/MM')
        WHEN p_trend_type = 'week' THEN 'Tuần ' || TO_CHAR(date_trunc('week', s.ngay_giam_sat), 'IW')
        ELSE RIGHT(TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM'), 2) || '/' || LEFT(TO_CHAR(date_trunc('month', s.ngay_giam_sat), 'YYYY-MM'), 4)
      END as label,
      count(o.id) as so_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1, 2
    ORDER BY 1
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ky', ky,
    'label', label,
    'so_co_hoi', so_co_hoi,
    'ty_le', CASE WHEN so_co_hoi > 0 THEN ROUND((dat * 100.0) / so_co_hoi, 1) ELSE 0 END
  )) INTO v_trend FROM trend_stats;

  -- 3. Thống kê theo Khoa (So sánh)
  WITH khoa_stats AS (
    SELECT 
      k.ten_khoa as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
    ORDER BY count(o.id) DESC
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_khoa FROM khoa_stats;

  -- 4. Thống kê theo Nghề nghiệp (So sánh đối tượng)
  WITH nghe_stats AS (
    SELECT 
      COALESCE(o.nghe_nghiep, 'Không rõ') as ten,
      count(o.id) as tong,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
    GROUP BY 1
    ORDER BY count(o.id) DESC
  )
  SELECT jsonb_agg(jsonb_build_object(
    'ten', ten,
    'dat', dat,
    'tong', tong,
    'ty_le', CASE WHEN tong > 0 THEN ROUND((dat * 100.0) / tong, 1) ELSE 0 END
  )) INTO v_by_nghe FROM nghe_stats;

  -- 5. Lỗi kỹ thuật / Thời gian / Lạm dụng găng (Error Breakdown)
  -- Phân tích sâu: % đúng kỹ thuật, % đủ thời gian TÍNH TRÊN SỐ CA CÓ TUÂN THỦ
  WITH error_stats AS (
    SELECT
      count(o.id) as tong_co_hoi,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con')) as so_ca_tuan_thu,
      count(o.id) FILTER (WHERE o.dung_ky_thuat = false) as loi_ky_thuat,
      count(o.id) FILTER (WHERE o.du_thoi_gian = false) as loi_thoi_gian,
      count(o.id) FILTER (WHERE o.co_deo_gang = true) as lam_dung_gang,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.dung_ky_thuat = true) as dung_ky_thuat_dat,
      count(o.id) FILTER (WHERE LOWER(UNACCENT(o.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') AND o.du_thoi_gian = true) as du_thoi_gian_dat
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND s.is_active = true
  )
  SELECT jsonb_build_object(
    'loi_ky_thuat', loi_ky_thuat,
    'loi_thoi_gian', loi_thoi_gian,
    'lam_dung_gang', lam_dung_gang,
    'ty_le_lam_dung_gang', CASE WHEN tong_co_hoi > 0 THEN ROUND((lam_dung_gang * 100.0) / tong_co_hoi, 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN so_ca_tuan_thu > 0 THEN ROUND((dung_ky_thuat_dat * 100.0) / so_ca_tuan_thu, 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN so_ca_tuan_thu > 0 THEN ROUND((du_thoi_gian_dat * 100.0) / so_ca_tuan_thu, 1) ELSE 0 END
  ) INTO v_error_breakdown FROM error_stats;

  -- 6. Thời điểm bỏ sót (Kém nhất)
  WITH missed AS (
    SELECT 
      COALESCE(o.thoi_diem, 'Không rõ') as ten,
      count(o.id) as so_lan
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'
      AND s.is_active = true
    GROUP BY 1
    ORDER BY 2 DESC
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_lan', so_lan)) INTO v_moment_missed FROM missed;

  -- 7. Thời điểm lạm dụng găng (Khi không tuân thủ)
  WITH glove_abuse AS (
    SELECT 
      COALESCE(o.thoi_diem, 'Không rõ') as ten,
      count(o.id) as so_lan
    FROM public.fact_giam_sat_vst_sessions s
    JOIN public.fact_giam_sat_vst o ON s.id = o.session_id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND o.co_deo_gang = true
      AND LOWER(UNACCENT(o.hanh_dong)) = 'bo sot'
      AND s.is_active = true
    GROUP BY 1
    ORDER BY 2 DESC
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_lan', so_lan)) INTO v_glove_abuse_by_moment FROM glove_abuse;

  -- Gom kết quả
  v_result := jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'kpis', v_kpis,
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'by_doi_tuong', COALESCE(v_by_nghe, '[]'::jsonb),
    'by_khu_vuc', '[]'::jsonb, -- Dữ liệu khu vực có thể add sau nếu table hỗ trợ
    'error_breakdown', v_error_breakdown,
    'moment_missed', COALESCE(v_moment_missed, '[]'::jsonb),
    'glove_abuse_by_moment', COALESCE(v_glove_abuse_by_moment, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
