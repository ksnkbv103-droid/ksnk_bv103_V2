-- Migration: Strategic Dashboard Analytics for VST
-- Date: 20/05/2026
-- Description: Creates RPCs for the new Strategic Command Center Dashboard

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[],
  p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[],
  p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[],
  p_hinh_thuc_ids text[] DEFAULT NULL::text[] -- stype: 'KSNK', 'TU_GIAM_SAT', 'CHEO'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_matrix_nghe jsonb;
  v_matrix_khu_vuc jsonb;
  v_moments jsonb;
  v_gap_analysis jsonb;
  v_workload jsonb;
BEGIN
  -- 1. KPIs
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(COUNT(DISTINCT session_id), 0),
    'tong_co_hoi', COALESCE(SUM(so_co_hoi), 0),
    'da_tuan_thu', COALESCE(SUM(da_tuan_thu), 0),
    'bo_sot', COALESCE(SUM(bo_sot), 0),
    'loi_ky_thuat', COALESCE(SUM(loi_ky_thuat), 0),
    'loi_thoi_gian', COALESCE(SUM(loi_thoi_gian), 0),
    'lam_dung_gang', COALESCE(SUM(lam_dung_gang), 0),
    'dung_ky_thuat', COALESCE(SUM(da_tuan_thu) - SUM(loi_ky_thuat), 0),
    'du_thoi_gian', COALESCE(SUM(da_tuan_thu) - SUM(loi_thoi_gian), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END,
    'ty_le_dung_ky_thuat', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_ky_thuat))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
    'ty_le_du_thoi_gian', CASE WHEN SUM(da_tuan_thu) > 0 THEN ROUND(((SUM(da_tuan_thu) - SUM(loi_thoi_gian))::numeric * 100) / SUM(da_tuan_thu), 1) ELSE 0 END,
    'ty_le_lam_dung_gang', CASE WHEN SUM(bo_sot) > 0 THEN ROUND((SUM(lam_dung_gang)::numeric * 100) / SUM(bo_sot), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.fact_vst_opportunities_summary s
  LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  -- 2. Trendline (by Week)
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trendline FROM (
    SELECT 
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label, 
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY 1
  ) t;

  -- 3. Matrix: By Khoa
  SELECT jsonb_agg(t) INTO v_matrix_khoa FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten, 
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_opportunities_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 4. Matrix: By Nghe
  SELECT jsonb_agg(t) INTO v_matrix_nghe FROM (
    SELECT 
      COALESCE(n.id, md5('unknown')::uuid) AS id, COALESCE(n.name, 'Không rõ') AS ten,
      SUM(s.so_co_hoi) AS tong_co_hoi, 
      SUM(s.da_tuan_thu) AS da_tuan_thu,
      CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_opportunities_summary s
    LEFT JOIN public.dm_lookup_value n ON s.nghe_nghiep_id = n.id AND n.category_type = 'NGHE_NGHIEP'
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY n.id, n.name
    ORDER BY tong_co_hoi DESC
  ) t;

  -- 5. Moments (5 Thời điểm)
  SELECT jsonb_agg(t) INTO v_moments FROM (
    SELECT 
      m.moment_label AS ten,
      SUM(m.so_quan_sat) AS tong_co_hoi,
      SUM(CASE WHEN m.is_tuan_thu THEN m.so_quan_sat ELSE 0 END) AS da_tuan_thu,
      CASE WHEN SUM(m.so_quan_sat) > 0 THEN ROUND((SUM(CASE WHEN m.is_tuan_thu THEN m.so_quan_sat ELSE 0 END)::numeric * 100) / SUM(m.so_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_vst_moments_summary m
    LEFT JOIN public.dm_khoa_phong k ON m.khoa_id = k.id
    WHERE m.ngay_giam_sat >= p_tu_ngay AND m.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR m.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR m.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR m.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR m.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY m.moment_label
    ORDER BY tong_co_hoi DESC
  ) t;

  -- 6. Gap Analysis (Tự giám sát vs Chuyên trách KSNK) by Khoa
  SELECT jsonb_agg(t) INTO v_gap_analysis FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) AS tgs_co_hoi,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_tgs,
           
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) AS ksnk_co_hoi,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_ksnk,
           
      -- Gap = TGS - KSNK
      CASE 
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END) > 0 AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END) > 0 
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.so_co_hoi ELSE 0 END), 1) 
             - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.da_tuan_thu ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.so_co_hoi ELSE 0 END), 1)
        ELSE NULL 
      END AS do_lech
    FROM public.fact_vst_opportunities_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    HAVING SUM(s.so_co_hoi) > 0
    ORDER BY k.ten_khoa
  ) t;

  -- 7. Workload KSNK & Coverage
  SELECT jsonb_build_object(
    'khoa_tu_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_co_hoi', (
      SELECT COALESCE(SUM(s.so_co_hoi), 0)
      FROM public.fact_vst_opportunities_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.fact_vst_sessions_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.so_co_hoi), 0) as so_co_hoi 
        FROM public.fact_vst_opportunities_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'CHEO'
      ) src
    )
  ) INTO v_workload;

  RETURN jsonb_build_object(
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'matrix_nghe', COALESCE(v_matrix_nghe, '[]'::jsonb),
    'moments', COALESCE(v_moments, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb),
    'workload', COALESCE(v_workload, '{}'::jsonb)
  );
END;
$$;
