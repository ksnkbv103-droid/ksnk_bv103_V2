-- Migration: Strategic Dashboard Analytics for GSC
-- Date: 20/05/2026
-- Description: Creates RPCs for the new Strategic Command Center Dashboard for GSC

CREATE OR REPLACE FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL::uuid[],
  p_khoa_ids uuid[] DEFAULT NULL::uuid[],
  p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[],
  p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[],
  p_hinh_thuc_ids text[] DEFAULT NULL::text[],
  p_bang_kiem_mas text[] DEFAULT NULL::text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_matrix_nghe jsonb;
  v_top_violations jsonb;
  v_gap_analysis jsonb;
  v_workload jsonb;
  v_dynamic_checklists jsonb;
BEGIN
  -- 1. KPIs
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(SUM(tong_phien), 0),
    'tong_quan_sat', COALESCE(SUM(tong_quan_sat), 0),
    'tong_dat', COALESCE(SUM(tong_dat), 0),
    'tong_vi_pham', COALESCE(SUM(tong_vi_pham), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(tong_quan_sat) > 0 THEN ROUND((SUM(tong_dat)::numeric * 100) / SUM(tong_quan_sat), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.fact_gsc_dashboard_summary s
  LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    AND (
      p_bang_kiem_mas IS NULL
      OR EXISTS (
        SELECT 1 FROM public.dm_bang_kiem dbk
        WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
      )
    );

  -- 2. Trendline (by Week)
  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trendline FROM (
    SELECT 
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label, 
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.tong_quan_sat) AS tong_quan_sat, 
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_gsc_dashboard_summary s
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY 1
  ) t;

  -- 3. Matrix: By Khoa
  SELECT jsonb_agg(t) INTO v_matrix_khoa FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten, 
      SUM(s.tong_quan_sat) AS tong_quan_sat, 
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 4. Top 10 Violations
  SELECT jsonb_agg(t) INTO v_top_violations FROM (
    SELECT 
      tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, bk.ten_bang_kiem,
      SUM(s.tong_vi_pham) AS so_vi_pham, 
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_vi_pham)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.fact_gsc_violations_summary s
    JOIN public.dm_tieu_chi_bang_kiem tc ON s.criterion_id = tc.id
    JOIN public.dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY tc.id, tc.noi_dung, bk.ten_bang_kiem
    HAVING SUM(s.tong_vi_pham) > 0
    ORDER BY so_vi_pham DESC LIMIT 10
  ) t;

  -- 5. Gap Analysis (TGS vs KSNK)
  SELECT jsonb_agg(t) INTO v_gap_analysis FROM (
    SELECT 
      k.id, k.ma_khoa, k.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) AS tgs_quan_sat,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_tgs,
           
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) AS ksnk_quan_sat,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0 
           THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1) 
           ELSE NULL END AS ty_le_ksnk,
           
      CASE 
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0 AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0 
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1) 
             - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100) / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL 
      END AS do_lech
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL
        OR EXISTS (
          SELECT 1 FROM public.dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY k.id, k.ma_khoa, k.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
    ORDER BY k.ten_khoa
  ) t;

  -- 6. Dynamic Checklists (Smart Hiding - Only checkists with data)
  SELECT jsonb_agg(t) INTO v_dynamic_checklists FROM (
    SELECT 
      bk.ma_bk, bk.ten_bang_kiem,
      SUM(s.tong_phien) AS tong_phien,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0 THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.fact_gsc_dashboard_summary s
    JOIN public.dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, bk.ten_bang_kiem
    HAVING SUM(s.tong_phien) > 0
    ORDER BY ty_le_tuan_thu DESC
  ) t;

  -- 7. Workload KSNK & Coverage
  SELECT jsonb_build_object(
    'khoa_tu_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'chuyen_de_duoc_ksnk_phu', (
      SELECT COUNT(DISTINCT s.bang_kiem_id)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.fact_gsc_dashboard_summary s
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
    ),
    'co_cau_giam_sat', (
      SELECT jsonb_agg(src) FROM (
        SELECT 'KSNK' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
        UNION ALL
        SELECT 'TU_GIAM_SAT' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
        UNION ALL
        SELECT 'CHEO' as ten, COALESCE(SUM(s.tong_phien), 0) as so_phien 
        FROM public.fact_gsc_dashboard_summary s 
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'CHEO'
      ) src
    )
  ) INTO v_workload;

  RETURN jsonb_build_object(
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'top_violations', COALESCE(v_top_violations, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb),
    'dynamic_checklists', COALESCE(v_dynamic_checklists, '[]'::jsonb),
    'workload', COALESCE(v_workload, '{}'::jsonb)
  );
END;
$$;
