-- Lát 2c: materialize base_all + wl_base; bỏ viol_base (tie-break lệch);
-- top_violations/viol_rank đọc trực tiếp fact như prod; bỏ work_mem strategic;
-- compare_matrices giữ work_mem 8MB; index M1 sessions active coalesce.
-- CHỈ GHI FILE — không apply. JSON shape/biểu thức giữ nguyên.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_gsc_strategic_analytics_impl(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[], p_bang_kiem_mas text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    WITH base_all AS MATERIALIZED (
      SELECT s.*
      FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
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
    ),
    kpis AS (
      SELECT jsonb_build_object(
        'tong_phien', COALESCE(SUM(s.tong_phien), 0),
        'tong_quan_sat', COALESCE(SUM(s.tong_quan_sat), 0),
        'tong_dat', COALESCE(SUM(s.tong_dat), 0),
        'tong_vi_pham', COALESCE(SUM(s.tong_vi_pham), 0),
        'ty_le_tuan_thu', CASE WHEN SUM(s.tong_quan_sat) > 0
          THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END
      ) AS val
      FROM base_all s
      WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
    ),
    trendline AS (
      SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) AS val FROM (
        SELECT
          'Tuần ' || to_char(s.ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', s.ngay_giam_sat), 'DD/MM') || ')' AS label,
          MIN(s.ngay_giam_sat) AS min_date,
          SUM(s.tong_quan_sat) AS tong_quan_sat,
          SUM(s.tong_dat) AS tong_dat,
          CASE WHEN SUM(s.tong_quan_sat) > 0
            THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
        FROM base_all s
        WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
        GROUP BY 1
      ) t
    ),
    matrix_khoa AS (
      SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) AS val FROM (
        SELECT
          kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
          SUM(s.tong_quan_sat) AS tong_quan_sat,
          SUM(s.tong_dat) AS tong_dat,
          CASE WHEN SUM(s.tong_quan_sat) > 0
            THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
        FROM base_all s
        JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
        WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
        GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
        HAVING SUM(s.tong_quan_sat) > 0
      ) t
    ),
    top_violations AS (
      SELECT COALESCE(jsonb_agg(t ORDER BY so_vi_pham DESC), '[]'::jsonb) AS val FROM (
        SELECT
          tc.id AS criterion_id,
          tc.noi_dung AS ten_tieu_chi,
          bk.ma_bk,
          bk.ten_bang_kiem,
          SUM(v.tong_vi_pham) AS so_vi_pham,
          SUM(v.tong_quan_sat) AS tong_quan_sat,
          CASE WHEN SUM(v.tong_quan_sat) > 0
            THEN ROUND((SUM(v.tong_vi_pham)::numeric * 100) / SUM(v.tong_quan_sat), 2) ELSE NULL END AS ty_le_vi_pham
        FROM public.gstt_fact_gsc_violations_summary v
        JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.resolved_criterion_id = tc.id
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
        HAVING SUM(v.tong_vi_pham) > 0 AND SUM(v.tong_quan_sat) >= 5
        ORDER BY so_vi_pham DESC
        LIMIT 10
      ) t
    ),
    gap_analysis AS (
      SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) AS val FROM (
        SELECT
          kp.id, kp.ma_khoa, kp.ten_khoa AS ten,
          SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE NULL END) AS tgs_quan_sat,
          SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE NULL END) AS tgs_dat,
          CASE WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE NULL END) > 0
            THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE NULL END)::numeric * 100)
              / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE NULL END), 2)
            ELSE NULL END AS ty_le_tgs,
          SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE NULL END) AS ksnk_quan_sat,
          SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE NULL END) AS ksnk_dat,
          CASE WHEN SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE NULL END) > 0
            THEN ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE NULL END)::numeric * 100)
              / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE NULL END), 2)
            ELSE NULL END AS ty_le_ksnk,
          CASE
            WHEN SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE NULL END) > 0
             AND SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE NULL END) > 0
            THEN ROUND((SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_dat ELSE NULL END)::numeric * 100)
              / SUM(CASE WHEN s.stype = 'TU_GIAM_SAT' THEN s.tong_quan_sat ELSE NULL END), 2)
              - ROUND((SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_dat ELSE NULL END)::numeric * 100)
              / SUM(CASE WHEN s.stype = 'KSNK' THEN s.tong_quan_sat ELSE NULL END), 2)
            ELSE NULL
          END AS do_lech
        FROM base_all s
        JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
        GROUP BY kp.id, kp.ma_khoa, kp.ten_khoa
        HAVING SUM(s.tong_quan_sat) > 0
      ) t
    ),
    dynamic_checklists AS (
      SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu ASC, ma_bk), '[]'::jsonb) AS val FROM (
        SELECT
          bk.ma_bk, bk.ten_bang_kiem,
          SUM(s.tong_phien) AS tong_phien,
          SUM(s.tong_quan_sat) AS tong_quan_sat,
          SUM(s.tong_dat) AS tong_dat,
          SUM(s.tong_vi_pham) AS tong_vi_pham,
          CASE WHEN SUM(s.tong_quan_sat) > 0
            THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
        FROM base_all s
        JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
        WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
          AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
        GROUP BY bk.ma_bk, bk.ten_bang_kiem
        HAVING SUM(s.tong_phien) > 0
      ) t
    ),
    bk_base AS (
      SELECT
        bk.ma_bk,
        bk.ten_bang_kiem,
        SUM(s.tong_phien) AS tong_phien,
        SUM(s.tong_quan_sat) AS tong_quan_sat,
        SUM(s.tong_dat) AS tong_dat,
        SUM(s.tong_vi_pham) AS tong_vi_pham,
        CASE WHEN SUM(s.tong_quan_sat) > 0
          THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
      FROM base_all s
      JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
      WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
        AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
      GROUP BY bk.ma_bk, bk.ten_bang_kiem
      HAVING SUM(s.tong_phien) > 0
    ),
    khoa_rank AS (
      SELECT DISTINCT ON (bk.ma_bk)
        bk.ma_bk,
        kp.ten_khoa AS worst_khoa_ten,
        CASE WHEN SUM(s.tong_quan_sat) > 0
          THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS worst_khoa_ty_le
      FROM base_all s
      JOIN public.gstt_dm_bang_kiem bk ON s.bang_kiem_id = bk.id
      JOIN public.mdm_dm_khoa_phong kp ON s.khoa_id = kp.id
      WHERE (p_hinh_thuc_ids IS NULL OR s.stype = ANY(p_hinh_thuc_ids))
        AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
      GROUP BY bk.ma_bk, kp.ten_khoa
      HAVING SUM(s.tong_quan_sat) > 0
      ORDER BY bk.ma_bk,
        CASE WHEN SUM(s.tong_quan_sat) > 0
          THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END ASC,
        kp.ten_khoa
    ),
    viol_rank AS (
      SELECT DISTINCT ON (bk.ma_bk)
        bk.ma_bk,
        tc.noi_dung AS top_violation_ten,
        SUM(v.tong_vi_pham)::bigint AS top_violation_so
      FROM public.gstt_fact_gsc_violations_summary v
      JOIN public.gstt_dm_bang_kiem bk ON v.bang_kiem_id = bk.id
      JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.resolved_criterion_id = tc.id
      LEFT JOIN public.mdm_dm_khoa_phong k ON v.khoa_id = k.id
      WHERE v.ngay_giam_sat >= p_tu_ngay AND v.ngay_giam_sat <= p_den_ngay
        AND (p_hinh_thuc_ids IS NULL OR v.stype = ANY(p_hinh_thuc_ids))
        AND (p_khoa_ids IS NULL OR v.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
        AND (p_nghe_nghiep_ids IS NULL OR v.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
        AND (p_khu_vuc_ids IS NULL OR v.khu_vuc_id = ANY(p_khu_vuc_ids))
        AND (p_bang_kiem_mas IS NULL OR bk.ma_bk = ANY(p_bang_kiem_mas))
      GROUP BY bk.ma_bk, tc.id, tc.noi_dung
      HAVING SUM(v.tong_vi_pham) > 0 AND SUM(v.tong_quan_sat) >= 5
      ORDER BY bk.ma_bk, SUM(v.tong_vi_pham) DESC
    ),
    checklist_overview AS (
      SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.ty_le_tuan_thu ASC, x.tong_vi_pham DESC), '[]'::jsonb) AS val
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
      ) x
    ),
    wl_base AS MATERIALIZED (
      SELECT s.khoa_id, s.bang_kiem_id, s.stype, s.tong_phien
      FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
      LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
      WHERE s.ngay_giam_sat >= p_tu_ngay AND s.ngay_giam_sat <= p_den_ngay
        AND (p_khoa_ids IS NULL OR s.khoa_id = ANY(p_khoa_ids))
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
    ),
    workload AS (
      SELECT jsonb_build_object(
        'khoa_tu_giam_sat', (
          SELECT COUNT(DISTINCT s.khoa_id)
          FROM wl_base s
          WHERE s.stype = 'TU_GIAM_SAT'
        ),
        'khoa_duoc_ksnk_giam_sat', (
          SELECT COUNT(DISTINCT s.khoa_id)
          FROM wl_base s
          WHERE s.stype = 'KSNK'
        ),
        'chuyen_de_duoc_ksnk_phu', (
          SELECT COUNT(DISTINCT s.bang_kiem_id)
          FROM wl_base s
          WHERE s.stype = 'KSNK'
        ),
        'ksnk_so_phien', (
          SELECT COALESCE(SUM(s.tong_phien), 0)
          FROM wl_base s
          WHERE s.stype = 'KSNK'
        ),
        'co_cau_giam_sat', (
          SELECT COALESCE(jsonb_agg(src), '[]'::jsonb) FROM (
            SELECT 'KSNK' AS ten, COALESCE(SUM(s.tong_phien), 0) AS so_phien
            FROM wl_base s
            WHERE s.stype = 'KSNK'
            UNION ALL
            SELECT 'TU_GIAM_SAT', COALESCE(SUM(s.tong_phien), 0)
            FROM wl_base s
            WHERE s.stype = 'TU_GIAM_SAT'
            UNION ALL
            SELECT 'CHEO', COALESCE(SUM(s.tong_phien), 0)
            FROM wl_base s
            WHERE s.stype = 'CHEO'
          ) src
        )
      ) AS val
    )
    SELECT jsonb_build_object(
      'kpis', COALESCE((SELECT val FROM kpis), '{}'::jsonb),
      'trendline', COALESCE((SELECT val FROM trendline), '[]'::jsonb),
      'matrix_khoa', COALESCE((SELECT val FROM matrix_khoa), '[]'::jsonb),
      'top_violations', COALESCE((SELECT val FROM top_violations), '[]'::jsonb),
      'gap_analysis', COALESCE((SELECT val FROM gap_analysis), '[]'::jsonb),
      'dynamic_checklists', COALESCE((SELECT val FROM dynamic_checklists), '[]'::jsonb),
      'checklist_overview', COALESCE((SELECT val FROM checklist_overview), '[]'::jsonb),
      'workload', COALESCE((SELECT val FROM workload), '{}'::jsonb)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_gsc_compare_matrices_impl(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[], p_bang_kiem_mas text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
 SET work_mem TO '8MB'
AS $function$
DECLARE
  v_khoi jsonb;
  v_khu_vuc jsonb;
  v_nghe jsonb;
  v_hinh_thuc jsonb;
  v_cach_thuc jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t ORDER BY t.ten), '[]'::jsonb) INTO v_khoi FROM (
    SELECT
      COALESCE(kk.ten_khoi, 'Không rõ') AS ten,
      COALESCE(kk.ma_khoi, '') AS ma_khoi,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
    LEFT JOIN public.mdm_dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.mdm_dm_khoi_khoa kk ON kk.id = k.khoi_id
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
    GROUP BY kk.id, kk.ten_khoi, kk.ma_khoi
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.thu_tu, t.ten), '[]'::jsonb) INTO v_khu_vuc FROM (
    SELECT
      COALESCE(kv.name, 'Không rõ') AS ten,
      COALESCE((kv.metadata ->> 'thu_tu')::integer, 999) AS thu_tu,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
    LEFT JOIN public.sys_lookup_value kv ON kv.id = s.khu_vuc_id
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
    GROUP BY COALESCE(kv.name, 'Không rõ'), COALESCE((kv.metadata ->> 'thu_tu')::integer, 999)
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_nghe FROM (
    SELECT
      COALESCE(nn.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
    LEFT JOIN public.sys_lookup_value nn ON nn.id = s.nghe_nghiep_id
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
    GROUP BY COALESCE(nn.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_hinh_thuc FROM (
    SELECT
      COALESCE(ht.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
    JOIN public.gstt_fact_chung_sessions sess ON sess.id = s.session_id
    LEFT JOIN public.sys_lookup_value ht ON ht.id = sess.hinh_thuc_id
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
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) INTO v_cach_thuc FROM (
    SELECT
      COALESCE(ct.name, 'Không rõ') AS ten,
      SUM(s.tong_quan_sat) AS tong_quan_sat,
      SUM(s.tong_dat) AS tong_dat,
      CASE WHEN SUM(s.tong_quan_sat) > 0
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
    JOIN public.gstt_fact_chung_sessions sess ON sess.id = s.session_id
    LEFT JOIN public.sys_lookup_value ct ON ct.id = sess.cach_thuc_id
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
    GROUP BY COALESCE(ct.name, 'Không rõ')
    HAVING SUM(s.tong_quan_sat) > 0
  ) t;

  RETURN jsonb_build_object(
    'matrix_khoi', v_khoi,
    'matrix_khu_vuc', v_khu_vuc,
    'matrix_nghe', v_nghe,
    'matrix_hinh_thuc', v_hinh_thuc,
    'matrix_cach_thuc', v_cach_thuc
  );
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_ngay_active_coalesce
  ON public.gstt_fact_chung_sessions (ngay_giam_sat) WHERE COALESCE(is_active, true) = true;

NOTIFY pgrst, 'reload schema';

COMMIT;
