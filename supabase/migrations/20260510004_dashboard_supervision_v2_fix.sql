-- Migration: Phân tách rõ 3 nguồn giám sát: KSNK (Khách quan), Giám sát chéo, Tự giám sát
-- Áp dụng cho rpc_get_compliance_dashboard_v2 và rpc_get_vst_dashboard_v2

CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_v2"(
  "p_tu_ngay" "date", 
  "p_den_ngay" "date", 
  "p_bang_kiem_mas" "text"[] DEFAULT NULL::"text"[], 
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
  v_trend JSONB;
  v_violations JSONB;
  v_supervision_sources JSONB;
  v_participation JSONB;
BEGIN
  -- 1. Tính toán summary tổng quát với bộ lọc nguồn
  WITH filtered_sessions AS (
    SELECT s.id, s.khoa_id, s.nghe_nghiep_id, s.khu_vuc_id, s.ngay_giam_sat, s.nguoi_giam_sat_id
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_supervision_type = 'ALL'
        OR (p_supervision_type = 'KSNK' AND (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
        OR (p_supervision_type = 'TU_GIAM_SAT' AND s.khoa_id = ns.khoa_id AND NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
        OR (p_supervision_type = 'CHEO' AND s.khoa_id != ns.khoa_id AND NOT (k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK'))
      )
  ),
  results_summary AS (
    SELECT 
      COUNT(DISTINCT s.id) as tong_phien,
      COUNT(r.id) as tong_quan_sat,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as tong_dat,
      COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as tong_vi_pham
    FROM filtered_sessions s
    LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_quan_sat', tong_quan_sat,
    'tong_vi_pham', tong_vi_pham,
    'ty_le_tuan_thu', CASE WHEN tong_quan_sat > 0 THEN ROUND((tong_dat::numeric * 100) / tong_quan_sat, 1) ELSE 0 END
  ) INTO v_summary FROM results_summary;

  -- Nguồn giám sát (luôn tính trên tập filtered để báo cáo khớp)
  WITH sources AS (
    SELECT 
      CASE 
        WHEN k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%' OR k_ns.ma_khoa = 'KSNK' THEN 'Khoa KSNK'
        WHEN s.khoa_id = ns.khoa_id THEN 'Tự giám sát'
        ELSE 'Giám sát chéo'
      END as ten,
      count(DISTINCT s.id) as so_phien
    FROM filtered_sessions s
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('ten', ten, 'so_phien', so_phien)) INTO v_supervision_sources FROM sources;

  -- Thống kê tham gia (Cơ cấu nguồn)
  WITH participation AS (
    SELECT k.id, k.ten_khoa as ten, count(DISTINCT s.id) as so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN public.fact_giam_sat_chung_sessions s ON k.id = s.khoa_id 
      AND s.is_active = true 
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR s.loai_bang_kiem = ANY(p_bang_kiem_mas))
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    -- Chỉ tính tự giám sát cho cơ cấu nguồn theo yêu cầu
    WHERE (s.id IS NULL OR (s.khoa_id = ns.khoa_id))
    GROUP BY 1, 2
  )
  SELECT jsonb_agg(jsonb_build_object('id', id, 'ten', ten, 'so_phien', so_phien)) INTO v_participation FROM participation;

  -- Các phần khác (by_khoa, trend, violations)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.fact_giam_sat_chung_results r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.fact_giam_sat_chung_results r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb),
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb),
    'participation', COALESCE(v_participation, '[]'::jsonb)
  );
END;
$$;
