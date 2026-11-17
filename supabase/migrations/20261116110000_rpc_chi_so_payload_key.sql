-- PO 2026-11-16: đổi khóa JSON chỉ số sang `chi_so` trong payload của 3 RPC thống kê
-- (rpc_dashboard_vst_strategic_analytics_impl, rpc_dashboard_gsc_strategic_analytics_impl,
-- rpc_gsc_checklist_detail_impl). Mã TypeScript đọc `chi_so` cùng đợt triển khai.
--
-- Chỉ đổi tên CTE, biến plpgsql và khóa JSON; công thức, chữ ký, SECURITY DEFINER, search_path
-- giữ nguyên. CREATE OR REPLACE không đụng ACL (acl-snapshot phải không lệch).
-- Thứ tự triển khai: áp migration này CÙNG LÚC với bản mã mới (bản mã cũ đọc khóa cũ sẽ không thấy chỉ số).
-- Cache ứng dụng (strategic-analytics-cache.ts): payload đầy đủ thêm đoạn khóa "v2"; payload rút gọn
-- đã đổi tên khóa cache ở lát trước. Cả hai không đọc lại bản cache cũ sau khi triển khai.
--
-- Phần cuối làm sạch hai nhận xét cột còn nhắc chữ cũ; nội dung khớp với migration gốc đã sửa.

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
    chi_so AS (
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
      'chi_so', COALESCE((SELECT val FROM chi_so), '{}'::jsonb),
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
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl(p_tu_ngay date, p_den_ngay date, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH session_base AS MATERIALIZED (
    SELECT
      s.id AS session_id,
      s.ngay_giam_sat,
      s.khoa_id,
      s.khu_vuc_id,
      s.nguoi_giam_sat_id,
      public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype
    FROM public.gstt_fact_vst_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
  ),
  session_scoped AS MATERIALIZED (
    SELECT sb.*, k.khoi_id, k.ma_khoa, k.ten_khoa
    FROM session_base sb
    LEFT JOIN public.mdm_dm_khoa_phong k ON sb.khoa_id = k.id
    WHERE (p_khoa_ids IS NULL OR sb.khoa_id = ANY(p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY(p_khoi_ids))
      AND (p_khu_vuc_ids IS NULL OR sb.khu_vuc_id = ANY(p_khu_vuc_ids))
  ),
  -- Mọi dòng (kể cả không hợp lệ) trong scope — để báo so_dong_khong_hop_le.
  opp_all AS MATERIALIZED (
    SELECT
      ss.session_id,
      d.hanh_dong,
      d.thoi_diem,
      public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem) AS is_valid,
      ss.stype,
      d.nghe_nghiep_id
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
  ),
  opp_core AS MATERIALIZED (
    SELECT
      ss.session_id,
      ss.ngay_giam_sat,
      COALESCE(d.khoa_id, ss.khoa_id) AS khoa_id,
      COALESCE(d.khu_vuc_id, ss.khu_vuc_id) AS khu_vuc_id,
      d.nghe_nghiep_id,
      ss.stype,
      1::bigint AS so_co_hoi,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END::bigint AS da_tuan_thu,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' THEN 1
        ELSE 0
      END::bigint AS bo_sot,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat = true THEN 1
        ELSE 0
      END::bigint AS dung_ky_thuat_cnt,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.dung_ky_thuat = false THEN 1
        ELSE 0
      END::bigint AS loi_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian = true THEN 1
        ELSE 0
      END::bigint AS du_thoi_gian_cnt,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')
          AND d.du_thoi_gian = false THEN 1
        ELSE 0
      END::bigint AS loi_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' AND d.co_deo_gang IS NOT NULL THEN 1
        ELSE 0
      END::bigint AS danh_gia_gang,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') = 'Bỏ sót' AND d.co_deo_gang = true THEN 1
        ELSE 0
      END::bigint AS lam_dung_gang,
      ss.khoi_id,
      ss.ma_khoa,
      ss.ten_khoa
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
  ),
  opp_filtered AS (
    SELECT *
    FROM opp_core
    WHERE (p_hinh_thuc_ids IS NULL OR stype = ANY(p_hinh_thuc_ids))
  ),
  moments_filtered AS MATERIALIZED (
    SELECT
      btrim(m.moment_part, E' \t\n\r') AS moment_label,
      (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
      1::bigint AS so_quan_sat
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS m(moment_part)
    WHERE (p_hinh_thuc_ids IS NULL OR ss.stype = ANY(p_hinh_thuc_ids))
      AND (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
      AND btrim(m.moment_part, E' \t\n\r') IN (
        'Trước khi tiếp xúc người bệnh',
        'Trước khi làm thủ thuật vô khuẩn',
        'Sau khi có nguy cơ tiếp xúc với dịch',
        'Sau khi tiếp xúc người bệnh',
        'Sau khi tiếp xúc xung quanh người bệnh'
      )
  ),
  opp_window AS MATERIALIZED (
    SELECT COALESCE(d.khoa_id, sb.khoa_id) AS khoa_id, sb.stype, 1::bigint AS so_co_hoi
    FROM public.gstt_fact_vst d
    INNER JOIN session_base sb ON d.session_id = sb.session_id
    WHERE public.fn_vst_is_valid_opportunity(d.hanh_dong, d.thoi_diem)
  ),
  chi_so AS (
    SELECT jsonb_build_object(
      'tong_phien', COALESCE(COUNT(DISTINCT session_id), 0),
      'tong_co_hoi', COALESCE(SUM(so_co_hoi), 0),
      'da_tuan_thu', COALESCE(SUM(da_tuan_thu), 0),
      'bo_sot', COALESCE(SUM(bo_sot), 0),
      'loi_ky_thuat', COALESCE(SUM(loi_ky_thuat), 0),
      'loi_thoi_gian', COALESCE(SUM(loi_thoi_gian), 0),
      'lam_dung_gang', COALESCE(SUM(lam_dung_gang), 0),
      'danh_gia_ky_thuat', COALESCE(SUM(danh_gia_ky_thuat), 0),
      'danh_gia_thoi_gian', COALESCE(SUM(danh_gia_thoi_gian), 0),
      'danh_gia_gang', COALESCE(SUM(danh_gia_gang), 0),
      'dung_ky_thuat', COALESCE(SUM(dung_ky_thuat_cnt), 0),
      'du_thoi_gian', COALESCE(SUM(du_thoi_gian_cnt), 0),
      'so_dong_khong_hop_le', (
        SELECT COUNT(*)::bigint
        FROM opp_all oa
        WHERE NOT oa.is_valid
          AND (p_hinh_thuc_ids IS NULL OR oa.stype = ANY(p_hinh_thuc_ids))
      ),
      'ty_le_tuan_thu', CASE WHEN SUM(so_co_hoi) > 0
        THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END,
      'ty_le_dung_ky_thuat', CASE WHEN SUM(danh_gia_ky_thuat) > 0
        THEN ROUND((SUM(dung_ky_thuat_cnt)::numeric * 100) / SUM(danh_gia_ky_thuat), 1) ELSE NULL END,
      'ty_le_du_thoi_gian', CASE WHEN SUM(danh_gia_thoi_gian) > 0
        THEN ROUND((SUM(du_thoi_gian_cnt)::numeric * 100) / SUM(danh_gia_thoi_gian), 1) ELSE NULL END,
      'ty_le_lam_dung_gang', CASE WHEN SUM(danh_gia_gang) > 0
        THEN ROUND((SUM(lam_dung_gang)::numeric * 100) / SUM(danh_gia_gang), 1) ELSE NULL END
    ) AS payload
    FROM opp_filtered
  ),
  trendline AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) AS payload
    FROM (
      SELECT
        'Tuần ' || to_char(ngay_giam_sat, 'IW') || ' (' || to_char(date_trunc('week', ngay_giam_sat), 'DD/MM') || ')' AS label,
        MIN(ngay_giam_sat) AS min_date,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered
      GROUP BY 1
    ) t
  ),
  matrix_khoa AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC NULLS LAST), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
    ) t
  ),
  matrix_nghe AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        COALESCE(n.id, md5('unknown')::uuid) AS id,
        COALESCE(n.name, 'Không rõ') AS ten,
        SUM(s.so_co_hoi) AS tong_co_hoi,
        SUM(s.da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE NULL END AS ty_le_tuan_thu
      FROM opp_filtered s
      LEFT JOIN public.sys_lookup_value n ON s.nghe_nghiep_id = n.id
      GROUP BY n.id, n.name
    ) t
  ),
  moments AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY tong_co_hoi DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        moment_label AS ten,
        SUM(so_quan_sat) AS tong_co_hoi,
        SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END) AS da_tuan_thu,
        CASE WHEN SUM(so_quan_sat) > 0
          THEN ROUND((SUM(CASE WHEN is_tuan_thu THEN so_quan_sat ELSE 0 END)::numeric * 100) / SUM(so_quan_sat), 1)
          ELSE NULL END AS ty_le_tuan_thu
      FROM moments_filtered
      GROUP BY moment_label
    ) t
  ),
  gap_analysis AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ten), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) AS tgs_co_hoi,
        SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END) AS tgs_dat,
        CASE WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_tgs,
        SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) AS ksnk_co_hoi,
        SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END) AS ksnk_dat,
        CASE WHEN SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL END AS ty_le_ksnk,
        CASE
          WHEN SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END) > 0
           AND SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'TU_GIAM_SAT' THEN so_co_hoi ELSE 0 END), 1)
            - ROUND((SUM(CASE WHEN stype = 'KSNK' THEN da_tuan_thu ELSE 0 END)::numeric * 100)
            / SUM(CASE WHEN stype = 'KSNK' THEN so_co_hoi ELSE 0 END), 1)
          ELSE NULL
        END AS do_lech
      FROM opp_filtered
      WHERE khoa_id IS NOT NULL
      GROUP BY khoa_id, ma_khoa, ten_khoa
      HAVING SUM(so_co_hoi) > 0
    ) t
  ),
  workload AS (
    SELECT jsonb_build_object(
      'khoa_tu_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'TU_GIAM_SAT'
      ),
      'khoa_duoc_ksnk_giam_sat', (
        SELECT COUNT(DISTINCT khoa_id) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_co_hoi', (
        SELECT COALESCE(SUM(so_co_hoi), 0) FROM opp_window WHERE stype = 'KSNK'
      ),
      'ksnk_so_phien', (
        SELECT COUNT(*) FROM session_base WHERE stype = 'KSNK'
      ),
      'co_cau_giam_sat', (
        SELECT COALESCE(jsonb_agg(src), '[]'::jsonb)
        FROM (
          SELECT 'KSNK' AS ten, COALESCE(SUM(so_co_hoi), 0) AS so_co_hoi
          FROM opp_window WHERE stype = 'KSNK'
          UNION ALL
          SELECT 'TU_GIAM_SAT', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'TU_GIAM_SAT'
          UNION ALL
          SELECT 'CHEO', COALESCE(SUM(so_co_hoi), 0)
          FROM opp_window WHERE stype = 'CHEO'
        ) src
      )
    ) AS payload
  )
  SELECT jsonb_build_object(
    'chi_so', COALESCE((SELECT payload FROM chi_so), '{}'::jsonb),
    'trendline', COALESCE((SELECT payload FROM trendline), '[]'::jsonb),
    'matrix_khoa', COALESCE((SELECT payload FROM matrix_khoa), '[]'::jsonb),
    'matrix_nghe', COALESCE((SELECT payload FROM matrix_nghe), '[]'::jsonb),
    'moments', COALESCE((SELECT payload FROM moments), '[]'::jsonb),
    'gap_analysis', COALESCE((SELECT payload FROM gap_analysis), '[]'::jsonb),
    'workload', COALESCE((SELECT payload FROM workload), '{}'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_gsc_checklist_detail_impl(p_tu_ngay date, p_den_ngay date, p_ma_bk text, p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_hinh_thuc_ids text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bk_id uuid;
  v_ten_bang_kiem text;
  v_chi_so jsonb;
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
      'chi_so', '{}'::jsonb,
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
      THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END
  ) INTO v_chi_so
  FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
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
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
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
        THEN ROUND((SUM(s.tong_dat)::numeric * 100) / SUM(s.tong_quan_sat), 2) ELSE NULL END AS ty_le_tuan_thu
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
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
          / SUM(v.tong_quan_sat), 2)
        ELSE NULL END AS ty_le_tuan_thu
    FROM public.gstt_dm_tieu_chi_bang_kiem tc
    LEFT JOIN public.gstt_fact_gsc_violations_summary v
      ON v.resolved_criterion_id = tc.id
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
        THEN ROUND((SUM(v.tong_vi_pham)::numeric * 100) / SUM(v.tong_quan_sat), 2) ELSE NULL END AS ty_le_vi_pham
    FROM public.gstt_fact_gsc_violations_summary v
    JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON v.resolved_criterion_id = tc.id
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
    FROM (SELECT * FROM public.gstt_fact_gsc_dashboard_summary WHERE loai_giam_sat IS NULL OR loai_giam_sat = 'TUAN_THU') s
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
    'chi_so', COALESCE(v_chi_so, '{}'::jsonb),
    'trendline', COALESCE(v_trendline, '[]'::jsonb),
    'matrix_khoa', COALESCE(v_matrix_khoa, '[]'::jsonb),
    'matrix_criterion', COALESCE(v_matrix_criterion, '[]'::jsonb),
    'criterion_khoa', COALESCE(v_criterion_khoa, '[]'::jsonb),
    'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb)
  );
END;
$function$
;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.hoan_thanh_luc IS 'Timestamp chính xác khi công việc được nghiệm thu (trang_thai → HOAN_THANH). Reset về NULL nếu bị trả làm lại. Dùng cho chỉ số đúng hạn thay vì updated_at.';

COMMENT ON COLUMN public.gstt_fact_chung_sessions.du_lieu_nghi_van IS 'Slice 4 (reform v4): Anti-Hawthorne flag — TRUE nếu phiên có dấu hiệu nghi ngờ (tốc độ quan sát >30/phút, hoặc thoi_gian_bat_dau = thoi_gian_ket_thuc). Dashboard Slice 7 cảnh báo nhưng KHÔNG loại trừ khỏi chỉ số (chính sách Just Culture defer v2).';
