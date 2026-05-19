-- RPC VST lấy số lượng tuyệt đối các lỗi cho bảng 5 thời điểm
CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL, "p_khoa_ids" "uuid"[] DEFAULT NULL, 
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL, "p_khu_vuc_ids" "uuid"[] DEFAULT NULL,
  "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS "json" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Bảng tạm sessions
  CREATE TEMP TABLE _vst_sess ON COMMIT DROP AS
  SELECT s.*, 
         k_ns.ma_khoa as ns_ma_khoa, k_ns.ten_khoa as ns_ten_khoa,
         k_t.ma_khoa as t_ma_khoa, k_t.ten_khoa as t_ten_khoa,
         CASE 
            WHEN (k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
                 AND (k_t.ma_khoa NOT IN ('KSNK','C18')) THEN 'KSNK'
            WHEN ((k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa IN ('KSNK','C18')))
                 OR (s.khoa_id = (SELECT khoa_id FROM mdm_nhan_su WHERE id = s.nguoi_giam_sat_id)) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
         END as stype
  FROM public.fact_giam_sat_vst_sessions s
  LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
  LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
  LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
  WHERE s.is_active = true AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.doi_tuong_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  IF p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess WHERE stype <> p_supervision_type;
  END IF;

  -- 2. Bảng tạm cơ hội
  CREATE TEMP TABLE _vst_opp ON COMMIT DROP AS
  SELECT d.*, 
         CASE WHEN LOWER(UNACCENT(d.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') THEN true ELSE false END as is_tuan_thu
  FROM public.fact_giam_sat_vst d
  JOIN _vst_sess s ON d.session_id = s.id;

  -- 3. Tổng hợp JSON
  SELECT jsonb_build_object(
    'kpis', (
      SELECT jsonb_build_object(
        'tong_phien', count(DISTINCT session_id),
        'tong_co_hoi', count(*),
        'da_tuan_thu', count(*) FILTER (WHERE is_tuan_thu = true),
        'bo_sot', count(*) FILTER (WHERE is_tuan_thu = false),
        'ty_le_tuan_thu', ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1)
      ) FROM _vst_opp
    ),
    'by_moment_table', (
      SELECT jsonb_agg(t) FROM (
        SELECT 
          thoi_diem as ten,
          count(*) as tong,
          count(*) FILTER (WHERE is_tuan_thu = false) as n_bo_sot,
          count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false) as n_lam_dung_gang,
          count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = false) as n_sai_ky_thuat,
          count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = false) as n_thieu_thoi_gian,
          ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) as ty_le_tuan_thu
        FROM _vst_opp
        GROUP BY thoi_diem ORDER BY thoi_diem
      ) t
    ),
    'participation', (
      SELECT jsonb_agg(t) FROM (
        SELECT t_ma_khoa as id, t_ten_khoa as ten, count(*) as so_phien
        FROM _vst_sess GROUP BY 1, 2 ORDER BY 3 ASC
      ) t
    ),
    'by_khoa', (
       SELECT jsonb_agg(t) FROM (
         SELECT t_ten_khoa as ten, count(*) as tong, count(*) FILTER (WHERE is_tuan_thu = true) as dat,
                ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) as ty_le
         FROM _vst_opp JOIN _vst_sess s ON _vst_opp.session_id = s.id GROUP BY 1 ORDER BY 4 DESC
       ) t
    ),
    'trend', (
      SELECT jsonb_agg(t) FROM (
        SELECT to_char(ngay_giam_sat, 'MM/YYYY') as label, 
               ROUND(count(*) FILTER (WHERE is_tuan_thu = true) * 100.0 / NULLIF(count(*), 0), 1) as ty_le
        FROM _vst_opp JOIN _vst_sess s ON _vst_opp.session_id = s.id GROUP BY 1 ORDER BY 1
      ) t
    ),
    'error_breakdown', (
      SELECT jsonb_build_object(
        'loi_ky_thuat', count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = false),
        'loi_thoi_gian', count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = false),
        'lam_dung_gang', count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false),
        'ty_le_lam_dung_gang', ROUND(count(*) FILTER (WHERE co_deo_gang = true AND is_tuan_thu = false) * 100.0 / NULLIF(count(*), 0), 1),
        'ty_le_dung_ky_thuat', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND dung_ky_thuat = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1),
        'ty_le_du_thoi_gian', ROUND(count(*) FILTER (WHERE is_tuan_thu = true AND du_thoi_gian = true) * 100.0 / NULLIF(count(*) FILTER (WHERE is_tuan_thu = true), 0), 1)
      ) FROM _vst_opp
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
