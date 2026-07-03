-- Wave 3: BK-first GSC analytics — checklist_overview + rpc_gsc_checklist_detail (mẫu VST).

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_gsc_checklist_detail(
  p_tu_ngay date,
  p_den_ngay date,
  p_ma_bk text,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_bk_id uuid;
  v_ten_bang_kiem text;
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_matrix_criterion jsonb;
  v_criterion_khoa jsonb;
  v_gap_analysis jsonb;
BEGIN
  SELECT bk.id, bk.ten_bang_kiem
  INTO v_bk_id, v_ten_bang_kiem
  FROM public.gstt_dm_bang_kiem bk
  WHERE bk.ma_bk = p_ma_bk
  LIMIT 1;

  IF v_bk_id IS NULL THEN
    RETURN jsonb_build_object(
      'ma_bk', p_ma_bk,
      'ten_bang_kiem', NULL,
      'kpis', '{}'::jsonb,
      'trendline', '[]'::jsonb,
      'matrix_khoa', '[]'::jsonb,
      'matrix_criterion', '[]'::jsonb,
      'criterion_khoa', '[]'::jsonb,
      'gap_analysis', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'tong_phien', COALESCE(SUM(s.tong_phien), 0),
    'tong_quan_sat', COALESCE(SUM(s.tong_quan_sat), 0),
    'tong_dat', COALESCE(SUM(s.tong_dat), 0),
    'tong_vi_pham', COALESCE(SUM(s.tong_vi_pham), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(s.tong_quan_sat) > 0
      THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.gstt_fact_gsc_dashboard_summary s
  LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.bang_kiem_id = v_bk_id
    AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids));

  SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trendline FROM (
    SELECT
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label,
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.bang_kiem_id = v_bk_id
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY 1
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu ASC, ten), '[]'::jsonb) INTO v_matrix_khoa FROM (
    SELECT
      kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      SUM(s.tong_vi_pham) AS tong_vi_pham,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.bang_kiem_id = v_bk_id
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu ASC, tong_vi_pham DESC, stt), '[]'::jsonb) INTO v_matrix_criterion FROM (
    SELECT
      tc.id AS criterion_id,
      tc.noi_dung AS ten_tieu_chi,
      tc.stt,
      COALESCE(SUM(v.tong_quan_sat), 0)::bigint AS tong_quan_sat,
      COALESCE(SUM(v.tong_vi_pham), 0)::bigint AS tong_vi_pham,
      (COALESCE(SUM(v.tong_quan_sat), 0) - COALESCE(SUM(v.tong_vi_pham), 0))::bigint AS tong_dat,
      CASE WHEN COALESCE(SUM(v.tong_quan_sat), 0) > 0
        THEN ROUND(((COALESCE(SUM(v.tong_quan_sat), 0) - COALESCE(SUM(v.tong_vi_pham), 0))::numeric * 100)
          / SUM(v.tong_quan_sat), 1)
        ELSE NULL END AS ty_le_tuan_thu
    FROM public.gstt_dm_tieu_chi_bang_kiem tc
    LEFT JOIN public.gstt_fact_gsc_violations_summary v
      ON v.criterion_id = tc.id
      AND v.bang_kiem_id = v_bk_id
      AND v.ngay_giam_sat >= p_tu_ngay AND v.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR v.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR v.khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR v.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR v.khu_vuc_id = ANY(p_khu_vuc_ids))
    LEFT JOIN public.mdm_dm_khoa_phong k ON v.khoa_id = k.id
    WHERE tc.bang_kiem_id = v_bk_id
      AND COALESCE(tc.is_active, true) = true
      AND (p_khoi_ids IS NULL OR k.khoi_id IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    GROUP BY tc.id, tc.noi_dung, tc.stt
    HAVING COALESCE(SUM(v.tong_quan_sat), 0) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) INTO v_criterion_khoa
  FROM (
    SELECT
      tc.id AS criterion_id,
      kp.id AS khoa_id,
      kp.ma_khoa,
      kp.ten_khoa AS ten,
      SUM(v.tong_quan_sat)::bigint AS tong_quan_sat,
      SUM(v.tong_vi_pham)::bigint AS tong_vi_pham,
      CASE WHEN SUM(v.tong_quan_sat) > 0
        THEN ROUND((SUM(v.tong_vi_pham)::numeric * 100) / SUM(v.tong_quan_sat), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.gstt_fact_gsc_violations_summary v
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.criterion_id = tc.id
    JOIN public.mdm_dm_khoa_phong kp ON v.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON v.khoa_id = k.id
    WHERE v.bang_kiem_id = v_bk_id
      AND v.ngay_giam_sat >= p_tu_ngay AND v.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR v.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR v.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR v.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR v.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY tc.id, kp.id, kp.ma_khoa, kp.ten_khoa
    HAVING SUM(v.tong_quan_sat) > 0
  ) x;

  SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) INTO v_gap_analysis FROM (
    SELECT
      kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) AS tgs_quan_sat,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL END AS ty_le_tgs,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) AS ksnk_quan_sat,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL END AS ty_le_ksnk,
      CASE
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0
         AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1)
          - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL
      END AS do_lech
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.bang_kiem_id = v_bk_id
      AND s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  RETURN jsonb_build_object(
    'ma_bk', p_ma_bk,
    'ten_bang_kiem', v_ten_bang_kiem,
    'kpis', COALESCE(v_kpis, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'matrix_criterion', COALESCE(v_matrix_criterion, '[]'::jsonb),
    'criterion_khoa', COALESCE(v_criterion_khoa, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL,
  p_bang_kiem_mas text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_kpis jsonb;
  v_trendline jsonb;
  v_matrix_khoa jsonb;
  v_top_violations jsonb;
  v_gap_analysis jsonb;
  v_workload jsonb;
  v_dynamic_checklists jsonb;
  v_checklist_overview jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tong_phien', COALESCE(SUM(s.tong_phien), 0),
    'tong_quan_sat', COALESCE(SUM(s.tong_quan_sat), 0),
    'tong_dat', COALESCE(SUM(s.tong_dat), 0),
    'tong_vi_pham', COALESCE(SUM(s.tong_vi_pham), 0),
    'ty_le_tuan_thu', CASE WHEN SUM(s.tong_quan_sat) > 0
      THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END
  ) INTO v_kpis
  FROM public.gstt_fact_gsc_dashboard_summary s
  LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
  WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
    AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
    AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
    AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
    AND (
      p_bang_kiem_mas IS NULL OR EXISTS (
        SELECT 1 FROM public.gstt_dm_bang_kiem dbk
        WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
      )
    );

  SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trendline FROM (
    SELECT
      'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label,
      MIN(s.ngay_giam_sat) AS min_date,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY 1
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_matrix_khoa FROM (
    SELECT
      kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY so_vi_pham DESC), '[]'::jsonb) INTO v_top_violations FROM (
    SELECT
      tc.id AS criterion_id,
      tc.noi_dung AS ten_tieu_chi,
      bk.ma_bk,
      bk.ten_bang_kiem,
      SUM(v.tong_vi_pham) AS so_vi_pham,
      SUM(v.tong_quan_sat) AS tong_quan_sat,
      CASE WHEN SUM(v.tong_quan_sat) > 0
        THEN ROUND((SUM(v.tong_vi_pham)::numeric * 100) / SUM(v.tong_quan_sat), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.gstt_fact_gsc_violations_summary v
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.criterion_id = tc.id
    JOIN public.gstt_dm_bang_kiem bk ON v.bang_kiem_id = bk.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON v.khoa_id = k.id
    WHERE v.ngay_giam_sat >= p_tu_ngay AND v.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR v.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR v.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR v.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR v.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY tc.id, tc.noi_dung, bk.ma_bk, bk.ten_bang_kiem
    HAVING SUM(v.tong_vi_pham) > 0
    ORDER BY so_vi_pham DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) INTO v_gap_analysis FROM (
    SELECT
      kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) AS tgs_quan_sat,
      SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END) AS tgs_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL END AS ty_le_tgs,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) AS ksnk_quan_sat,
      SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END) AS ksnk_dat,
      CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL END AS ty_le_ksnk,
      CASE
        WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END) > 0
         AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE 0 END), 1)
          - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE 0 END)::numeric * 100)
          / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE 0 END), 1)
        ELSE NULL
      END AS do_lech
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (
        p_bang_kiem_mas IS NULL OR EXISTS (
          SELECT 1 FROM public.gstt_dm_bang_kiem dbk
          WHERE dbk.id = s.bang_kiem_id AND dbk.ma_bk = ANY(p_bang_kiem_mas)
        )
      )
    GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu ASC, ma_bk), '[]'::jsonb) INTO v_dynamic_checklists FROM (
    SELECT
      bk.ma_bk, bk.ten_bang_kiem,
      SUM(s.tong_phien) AS tong_phien,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      SUM(s.tong_vi_pham) AS tong_vi_pham,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, bk.ten_bang_kiem
    HAVING SUM(s.tong_phien) > 0
  ) t;

  WITH bk_base AS (
    SELECT
      bk.ma_bk,
      bk.ten_bang_kiem,
      SUM(s.tong_phien) AS tong_phien,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      SUM(s.tong_vi_pham) AS tong_vi_pham,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS ty_le_tuan_thu
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, bk.ten_bang_kiem
    HAVING SUM(s.tong_phien) > 0
  ),
  khoa_rank AS (
    SELECT DISTINCT ON (bk.ma_bk)
      bk.ma_bk,
      kp.ten_khoa AS worst_khoa_ten,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END AS worst_khoa_ty_le
    FROM public.gstt_fact_gsc_dashboard_summary s
    JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
    JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, kp.ten_khoa
    HAVING SUM(s.tong_quan_sat) > 0
    ORDER BY bk.ma_bk,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 1) ELSE 0 END ASC,
      kp.ten_khoa
  ),
  viol_rank AS (
    SELECT DISTINCT ON (bk.ma_bk)
      bk.ma_bk,
      tc.noi_dung AS top_violation_ten,
      SUM(v.tong_vi_pham)::bigint AS top_violation_so
    FROM public.gstt_fact_gsc_violations_summary v
    JOIN public.gstt_dm_bang_kiem bk ON v.bang_kiem_id = bk.id
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.criterion_id = tc.id
    LEFT JOIN public.mdm_dm_khoa_phong k ON v.khoa_id = k.id
    WHERE v.ngay_giam_sat >= p_tu_ngay AND v.ngay_giam_sat <= p_den_ngay
      AND (p_hinh_thuc_ids IS NULL OR v.stype = ANY(p_hinh_thuc_ids))
      AND (p_khoa_ids IS NULL OR v.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR v.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR v.khu_vuc_id = ANY(p_khu_vuc_ids))
      AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
    GROUP BY bk.ma_bk, tc.id, tc.noi_dung
    HAVING SUM(v.tong_vi_pham) > 0
    ORDER BY bk.ma_bk, SUM(v.tong_vi_pham) DESC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.ty_le_tuan_thu ASC, x.tong_vi_pham DESC), '[]'::jsonb)
  INTO v_checklist_overview
  FROM (
    SELECT
      b.ma_bk,
      b.ten_bang_kiem,
      b.tong_phien,
      b.tong_quan_sat,
      b.tong_dat,
      b.tong_vi_pham,
      b.ty_le_tuan_thu,
      kr.worst_khoa_ten,
      kr.worst_khoa_ty_le,
      vr.top_violation_ten,
      vr.top_violation_so
    FROM bk_base b
    LEFT JOIN khoa_rank kr ON kr.ma_bk = b.ma_bk
    LEFT JOIN viol_rank vr ON vr.ma_bk = b.ma_bk
  ) x;

  SELECT jsonb_build_object(
    'khoa_tu_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND s.stype = 'TU_GIAM_SAT'
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    ),
    'khoa_duoc_ksnk_giam_sat', (
      SELECT COUNT(DISTINCT s.khoa_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND s.stype = 'KSNK'
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    ),
    'chuyen_de_duoc_ksnk_phu', (
      SELECT COUNT(DISTINCT s.bang_kiem_id)
      FROM public.gstt_fact_gsc_dashboard_summary s
      LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND s.stype = 'KSNK'
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    ),
    'ksnk_so_phien', (
      SELECT COALESCE(SUM(s.tong_phien), 0)
      FROM public.gstt_fact_gsc_dashboard_summary s
      LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND s.stype = 'KSNK'
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    ),
    'co_cau_giam_sat', (
      SELECT COALESCE(jsonb_agg(src), '[]'::jsonb) FROM (
        SELECT 'KSNK' AS ten, COALESCE(SUM(s.tong_phien), 0) AS so_phien
        FROM public.gstt_fact_gsc_dashboard_summary s
        LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'KSNK'
          AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
          AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
        UNION ALL
        SELECT 'TU_GIAM_SAT', COALESCE(SUM(s.tong_phien), 0)
        FROM public.gstt_fact_gsc_dashboard_summary s
        LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'TU_GIAM_SAT'
          AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
          AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
        UNION ALL
        SELECT 'CHEO', COALESCE(SUM(s.tong_phien), 0)
        FROM public.gstt_fact_gsc_dashboard_summary s
        LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
        WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay AND s.stype = 'CHEO'
          AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
          AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
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
    'checklist_overview', COALESCE(v_checklist_overview, '[]'::jsonb),
    'workload', COALESCE(v_workload, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_gsc_checklist_detail(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) TO anon, authenticated, service_role;

COMMIT;
