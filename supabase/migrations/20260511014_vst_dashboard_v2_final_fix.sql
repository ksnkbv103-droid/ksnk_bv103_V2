-- Sửa lại RPC VST để trỏ đúng bảng fact_giam_sat_vst thực tế của BV103
CREATE OR REPLACE FUNCTION "public"."rpc_get_vst_dashboard_v2"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_khoi_ids" "uuid"[] DEFAULT NULL, "p_khoa_ids" "uuid"[] DEFAULT NULL, 
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL, "p_khu_vuc_ids" "uuid"[] DEFAULT NULL,
  "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS "json" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Tạo bảng tạm chứa các sessions đã lọc
  CREATE TEMP TABLE _vst_sess ON COMMIT DROP AS
  SELECT s.*, 
         ns.khoa_id as ns_khoa_id,
         k_ns.ma_khoa as ns_ma_khoa, k_ns.ten_khoa as ns_ten_khoa,
         k_t.ma_khoa as t_ma_khoa, k_t.ten_khoa as t_ten_khoa,
         k_t.ten_khoa as ten_khoa_duoc_gs,
         CASE 
            WHEN (k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') 
                 AND (k_t.ma_khoa NOT IN ('KSNK','C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%') THEN 'KSNK'
            WHEN ((k_ns.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%') AND (k_t.ma_khoa IN ('KSNK','C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%'))
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
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  -- Lọc theo nguồn nếu yêu cầu
  IF p_supervision_type <> 'ALL' THEN
    DELETE FROM _vst_sess WHERE stype <> p_supervision_type;
  END IF;

  -- Tạo bảng cơ hội (Dùng fact_giam_sat_vst thay vì _details)
  CREATE TEMP TABLE _vst_opp ON COMMIT DROP AS
  SELECT d.*, 
         CASE 
           WHEN LOWER(UNACCENT(d.hanh_dong)) IN ('rua tay bang nuoc', 'cha tay bang con') THEN 'DAT'
           ELSE 'KHONG_DAT'
         END as ket_qua
  FROM public.fact_giam_sat_vst d
  JOIN _vst_sess s ON d.session_id = s.id;

  -- Tổng hợp kết quả JSON
  SELECT jsonb_build_object(
    'kpis', (
      SELECT jsonb_build_object(
        'tong_phien', count(DISTINCT session_id),
        'tong_co_hoi', count(*),
        'da_tuan_thu', count(*) FILTER (WHERE ket_qua = 'DAT'),
        'bo_sot', count(*) FILTER (WHERE ket_qua = 'KHONG_DAT'),
        'ty_le_tuan_thu', ROUND(count(*) FILTER (WHERE ket_qua = 'DAT') * 100.0 / NULLIF(count(*), 0), 1)
      ) FROM _vst_opp
    ),
    'supervision_sources', (
      SELECT jsonb_agg(t) FROM (
        SELECT 
          CASE WHEN stype = 'KSNK' THEN 'Chuyên trách (KSNK)' WHEN stype = 'CHEO' THEN 'Giám sát chéo' ELSE 'Tự giám sát' END as ten,
          count(*) as so_phien
        FROM _vst_sess GROUP BY stype
      ) t
    ),
    'by_moment_table', (
      SELECT jsonb_agg(t) FROM (
        SELECT 
          thoi_diem as ten,
          count(*) as tong,
          ROUND(count(*) FILTER (WHERE ket_qua = 'KHONG_DAT') * 100.0 / NULLIF(count(*), 0), 1) as ty_le_bo_sot,
          ROUND(count(*) FILTER (WHERE co_deo_gang = true AND ket_qua = 'KHONG_DAT') * 100.0 / NULLIF(count(*) FILTER (WHERE ket_qua = 'KHONG_DAT'), 0), 1) as ty_le_lam_dung_gang,
          ROUND(count(*) FILTER (WHERE ket_qua = 'DAT') * 100.0 / NULLIF(count(*), 0), 1) as ty_le_tuan_thu,
          ROUND(count(*) FILTER (WHERE du_thoi_gian = true AND ket_qua = 'DAT') * 100.0 / NULLIF(count(*) FILTER (WHERE ket_qua = 'DAT'), 0), 1) as ty_le_du_thoi_gian,
          ROUND(count(*) FILTER (WHERE dung_ky_thuat = true AND ket_qua = 'DAT') * 100.0 / NULLIF(count(*) FILTER (WHERE ket_qua = 'DAT'), 0), 1) as ty_le_dung_ky_thuat
        FROM _vst_opp
        GROUP BY thoi_diem ORDER BY thoi_diem
      ) t
    ),
    'participation', (
      SELECT jsonb_agg(t) FROM (
        SELECT t_ma_khoa as id, t_ten_khoa as ten, count(*) as so_phien
        FROM _vst_sess GROUP BY t_ma_khoa, t_ten_khoa ORDER BY so_phien ASC
      ) t
    ),
    'by_khoa', (
       SELECT jsonb_agg(t) FROM (
         SELECT ten_khoa_duoc_gs as ten, count(*) as tong, count(*) FILTER (WHERE ket_qua = 'DAT') as dat,
                ROUND(count(*) FILTER (WHERE ket_qua = 'DAT') * 100.0 / NULLIF(count(*), 0), 1) as ty_le
         FROM _vst_opp GROUP BY ten_khoa_duoc_gs ORDER BY ty_le DESC
       ) t
    ),
    'trend', (
      SELECT jsonb_agg(t) FROM (
        SELECT to_char(ngay_giam_sat, 'MM/YYYY') as label, 
               ROUND(count(*) FILTER (WHERE ket_qua = 'DAT') * 100.0 / NULLIF(count(*), 0), 1) as ty_le
        FROM _vst_opp JOIN _vst_sess s ON _vst_opp.session_id = s.id
        GROUP BY 1 ORDER BY 1
      ) t
    ),
    'error_breakdown', (
      SELECT jsonb_build_object(
        'loi_ky_thuat', count(*) FILTER (WHERE ket_qua = 'DAT' AND dung_ky_thuat = false),
        'loi_thoi_gian', count(*) FILTER (WHERE ket_qua = 'DAT' AND du_thoi_gian = false),
        'lam_dung_gang', count(*) FILTER (WHERE co_deo_gang = true AND ket_qua = 'KHONG_DAT'),
        'ty_le_lam_dung_gang', ROUND(count(*) FILTER (WHERE co_deo_gang = true AND ket_qua = 'KHONG_DAT') * 100.0 / NULLIF(count(*), 0), 1),
        'ty_le_dung_ky_thuat', ROUND(count(*) FILTER (WHERE ket_qua = 'DAT' AND dung_ky_thuat = true) * 100.0 / NULLIF(count(*) FILTER (WHERE ket_qua = 'DAT'), 0), 1),
        'ty_le_du_thoi_gian', ROUND(count(*) FILTER (WHERE ket_qua = 'DAT' AND du_thoi_gian = true) * 100.0 / NULLIF(count(*) FILTER (WHERE ket_qua = 'DAT'), 0), 1)
      ) FROM _vst_opp
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
