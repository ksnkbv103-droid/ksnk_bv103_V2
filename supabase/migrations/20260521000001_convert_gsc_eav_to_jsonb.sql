-- Migration: Convert fact_giam_sat_chung EAV results to Hybrid JSONB
-- Date: 21/05/2026

-- 1. Add results_jsonb column with default '[]'::jsonb to fact_giam_sat_chung_sessions
ALTER TABLE public.fact_giam_sat_chung_sessions ADD COLUMN IF NOT EXISTS results_jsonb jsonb DEFAULT '[]'::jsonb NOT NULL;

-- 2. Migrate historical data from EAV fact_giam_sat_chung_results to results_jsonb
WITH aggregated AS (
  SELECT 
    session_id, 
    jsonb_agg(
      jsonb_build_object(
        'criterion_id', criterion_id,
        'value', value,
        'note', note
      )
    ) AS results
  FROM public.fact_giam_sat_chung_results
  GROUP BY session_id
)
UPDATE public.fact_giam_sat_chung_sessions s
SET results_jsonb = aggregated.results
FROM aggregated
WHERE s.id = aggregated.session_id;

-- 3. Drop legacy EAV table fact_giam_sat_chung_results (cascading any views/constraints)
DROP TABLE IF EXISTS public.fact_giam_sat_chung_results CASCADE;

-- Drop legacy views first to avoid "cannot change name of view column" error when adding new columns
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;

-- 4. Recreate v_fact_giam_sat_chung_sessions_full view exposing the results_jsonb column
CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.bang_kiem_id,
    bk.ma_bk AS loai_bang_kiem,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.is_giam_sat_ca_nhan,
    s.nhan_vien_id,
    s.nghe_nghiep_id,
    s.ngay_giam_sat,
    s.thoi_gian_ghi_nhan,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.tong_diem,
    s.ghi_chu_chung,
    s.is_manual_nhan_vien,
    s.ten_manual_nhan_vien,
    s.is_bo_sung_nguoi_benh,
    s.ma_nguoi_benh,
    s.ten_nguoi_benh,
    s.so_giuong_nguoi_benh,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    s.results_jsonb,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    ns_gs.ma_nv AS ma_nguoi_giam_sat,
    ns_nv.ho_ten AS ten_nhan_vien,
    ns_nv.ma_nv AS ma_nhan_vien,
    nn.code AS ma_nghe_nghiep,
    nn.name AS ten_nghe_nghiep,
    ht.code AS ma_hinh_thuc_giam_sat,
    ht.name AS ten_hinh_thuc_danh_muc,
    ht.name AS hinh_thuc_giam_sat,
    ct.code AS ma_cach_thuc_giam_sat,
    ct.name AS ten_cach_thuc_danh_muc,
    ct.name AS cach_thuc_giam_sat,
    bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
   FROM ((((((((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.mdm_nhan_su ns_nv ON ((ns_nv.id = s.nhan_vien_id)))
     LEFT JOIN public.dm_lookup_value nn ON ((nn.id = s.nghe_nghiep_id AND nn.category_type = 'NGHE_NGHIEP')))
     LEFT JOIN public.dm_lookup_value ht ON ((ht.id = s.hinh_thuc_id AND ht.category_type = 'HINH_THUC_GIAM_SAT')))
     LEFT JOIN public.dm_lookup_value ct ON ((ct.id = s.cach_thuc_id AND ct.category_type = 'CACH_THUC_GIAM_SAT')))
  WHERE (COALESCE(s.is_active, true) = true);

-- 5. Recreate v_gsc_dashboard_rows view to unpack results_jsonb column using a LATERAL join
CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id,
    s.ngay_giam_sat,
    s.created_at,
    COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem,
    s.tong_diem,
    s.khoa_id,
    kp.ten_khoa,
    (r.elem->>'criterion_id')::uuid AS id,
    (r.elem->>'criterion_id')::uuid AS result_id,
    (r.elem->>'criterion_id')::uuid AS criterion_id,
    r.elem->>'value' AS value,
    r.elem->>'value' AS result_value,
    r.elem->>'note' AS note
   FROM (((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong kp ON ((kp.id = s.khoa_id)))
     LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON true)
  WHERE (s.is_active = true);

-- 6. Create GIN index on results_jsonb column for optimized dynamic query paths
CREATE INDEX IF NOT EXISTS idx_gsc_results_jsonb ON public.fact_giam_sat_chung_sessions USING gin (results_jsonb jsonb_path_ops);

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.results_jsonb IS 'Danh sách mảng kết quả chi tiết các tiêu chí dưới dạng JSONB (thay thế EAV)';

-- 7. Redefine GSC compliance and dashboard RPC functions to query public.v_gsc_dashboard_rows view

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_summary JSONB;
  v_by_khoa JSONB;
  v_by_nghe JSONB;
  v_trend JSONB;
  v_violations JSONB;
  v_supervision_sources JSONB;
BEGIN
  -- 1. Tính toán summary tổng quát
  WITH filtered_sessions AS (
    SELECT id, khoa_id, nghe_nghiep_id, khu_vuc_id, ngay_giam_sat, nguoi_giam_sat_id
    FROM public.fact_giam_sat_chung_sessions
    WHERE is_active = true
      AND ngay_giam_sat >= p_tu_ngay AND ngay_giam_sat <= p_den_ngay
      AND (p_bang_kiem_mas IS NULL OR loai_bang_kiem = ANY(p_bang_kiem_mas))
      AND (p_khoa_ids IS NULL OR khoa_id = ANY(p_khoa_ids))
      AND (p_nghe_nghiep_ids IS NULL OR nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR khu_vuc_id = ANY(p_khu_vuc_ids))
  ),
  results_summary AS (
    SELECT 
      COUNT(DISTINCT s.id) as tong_phien,
      COUNT(r.id) as tong_quan_sat,
      COUNT(r.id) FILTER (WHERE r.value = 'DAT') as tong_dat,
      COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as tong_vi_pham
    FROM filtered_sessions s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
  )
  SELECT jsonb_build_object(
    'tong_phien', tong_phien,
    'tong_quan_sat', tong_quan_sat,
    'tong_vi_pham', tong_vi_pham,
    'ty_le_tuan_thu', CASE WHEN tong_quan_sat > 0 THEN ROUND((tong_dat::numeric * 100) / tong_quan_sat, 1) ELSE 0 END
  ) INTO v_summary FROM results_summary;

  -- Nguồn giám sát
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

  -- Các phần khác giữ nguyên (by_khoa, trend, vi phạm...)
  SELECT jsonb_agg(t) INTO v_by_khoa FROM (
    SELECT k.ten_khoa as ten, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
    GROUP BY 1 HAVING COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0 ORDER BY 2 DESC LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'by_khoa', COALESCE(v_by_khoa, '[]'::jsonb),
    'trend', COALESCE(v_trend, '[]'::jsonb),
    'violations', COALESCE(v_violations, '[]'::jsonb),
    'supervision_sources', COALESCE(v_supervision_sources, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_multi_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[], p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  IF p_bang_kiem_mas IS NULL OR array_length(p_bang_kiem_mas, 1) IS NULL THEN
    RETURN '{}'::json;
  END IF;

  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    RETURN public.rpc_get_compliance_dashboard_multi_v1(
      p_tu_ngay, p_den_ngay, p_bang_kiem_mas,
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    );
  END IF;

  CREATE TEMP TABLE _gsc_sessions_multi ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT jsonb_build_object(
      'tong_phien', count(DISTINCT s.id),
      'tong_quan_sat', count(r.id),
      'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
      'ty_le_tuan_thu',
      CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
    )
    INTO v_sum
    FROM _gsc_sessions_multi s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    WHERE s.loai_bang_kiem = v_ma_bk;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb)
    INTO v_khoa
    FROM (
      SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      ORDER BY 5 DESC
      LIMIT 50
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_nghe FROM (
      SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_khu FROM (
      SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
             count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2 ORDER BY 3 DESC
    ) t;

    SELECT coalesce(jsonb_agg(t ORDER BY min_date), '[]'::jsonb) INTO v_trend FROM (
      SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
             count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
      FROM _gsc_sessions_multi s
      LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_violation FROM (
      SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
             CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
      FROM public.v_gsc_dashboard_rows r
      JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
      JOIN _gsc_sessions_multi s ON r.session_id = s.id
      WHERE s.loai_bang_kiem = v_ma_bk
      GROUP BY 1, 2
      HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
      ORDER BY 3 DESC LIMIT 20
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_source FROM (
      SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
      UNION ALL
      SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions_multi WHERE loai_bang_kiem = v_ma_bk
    ) t;

    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO v_part FROM (
      SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
      FROM public.dm_khoa_phong k
      LEFT JOIN _gsc_sessions_multi s ON k.id = s.khoa_id AND s.loai_bang_kiem = v_ma_bk
      WHERE k.is_active = true
        AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
        AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
      GROUP BY 1, 2
      ORDER BY 3 ASC, 2 ASC
    ) t;

    v_sub_res := jsonb_build_object(
      'summary', v_sum,
      'by_khoa', coalesce(v_khoa, '[]'::jsonb),
      'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
      'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
      'trend', coalesce(v_trend, '[]'::jsonb),
      'violations', coalesce(v_violation, '[]'::jsonb),
      'supervision_sources', coalesce(v_source, '[]'::jsonb),
      'participation', coalesce(v_part, '[]'::jsonb)
    );

    v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
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
    FROM filtered_sessions s JOIN public.dm_khoa_phong k ON s.khoa_id = k.id LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY 1 ORDER BY 4 DESC, 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', s.ngay_giam_sat), 'MM/YY') as label, COUNT(r.id) FILTER (WHERE r.value = 'DAT') as dat, COUNT(r.id) as tong, CASE WHEN COUNT(r.id) > 0 THEN ROUND((COUNT(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / COUNT(r.id), 1) ELSE 0 END as ty_le
    FROM filtered_sessions s LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id GROUP BY date_trunc('month', s.ngay_giam_sat), 1 ORDER BY date_trunc('month', s.ngay_giam_sat) ASC
  ) t;

  SELECT jsonb_agg(t) INTO v_violations FROM (
    SELECT tc.noi_dung as ten_tieu_chi, COUNT(r.id) FILTER (WHERE r.value = 'KHONG_DAT') as so_vi_pham
    FROM public.v_gsc_dashboard_rows r JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id JOIN filtered_sessions s ON r.session_id = s.id
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

CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v2(p_tu_ngay date, p_den_ngay date, p_bang_kiem_mas text[] DEFAULT NULL::text[], p_khoi_ids uuid[] DEFAULT NULL::uuid[], p_khoa_ids uuid[] DEFAULT NULL::uuid[], p_nghe_nghiep_ids uuid[] DEFAULT NULL::uuid[], p_khu_vuc_ids uuid[] DEFAULT NULL::uuid[], p_supervision_type text DEFAULT 'ALL'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sum jsonb;
  v_khoa jsonb;
  v_nghe jsonb;
  v_khu jsonb;
  v_trend jsonb;
  v_violation jsonb;
  v_source jsonb;
  v_part jsonb;
BEGIN
  DROP TABLE IF EXISTS _gsc_sessions;

  CREATE TEMP TABLE _gsc_sessions ON COMMIT DROP AS
    SELECT
      s.id,
      s.khoa_id,
      s.nghe_nghiep_id,
      s.khu_vuc_id,
      s.ngay_giam_sat,
      coalesce(bk.ma_bk, '') AS loai_bang_kiem,
      CASE
        WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
             AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
        WHEN (
          (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
          AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
        )
        OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
        ELSE 'CHEO'
      END AS stype
    FROM public.fact_giam_sat_chung_sessions s
    LEFT JOIN public.dm_bang_kiem bk ON bk.id = s.bang_kiem_id
    LEFT JOIN public.mdm_nhan_su ns ON s.nguoi_giam_sat_id = ns.id
    LEFT JOIN public.dm_khoa_phong k_ns ON ns.khoa_id = k_ns.id
    LEFT JOIN public.dm_khoa_phong k_t ON s.khoa_id = k_t.id
    WHERE s.is_active = true
      AND s.ngay_giam_sat >= p_tu_ngay
      AND s.ngay_giam_sat <= p_den_ngay
      AND (
        p_supervision_type = 'ALL'
        OR (
          CASE
            WHEN (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
                 AND (k_t.ma_khoa IS NULL OR (k_t.ma_khoa NOT IN ('KSNK', 'C18') AND k_t.ten_khoa NOT ILIKE '%Kiểm soát nhiễm khuẩn%')) THEN 'KSNK'
            WHEN (
              (k_ns.ma_khoa IN ('KSNK', 'C18') OR k_ns.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
              AND (k_t.ma_khoa IN ('KSNK', 'C18') OR k_t.ten_khoa ILIKE '%Kiểm soát nhiễm khuẩn%')
            )
            OR (ns.khoa_id IS NOT NULL AND s.khoa_id = ns.khoa_id) THEN 'TU_GIAM_SAT'
            ELSE 'CHEO'
          END = p_supervision_type
        )
      )
      AND (
        p_bang_kiem_mas IS NULL
        OR bk.ma_bk = ANY (p_bang_kiem_mas)
        OR bk.id::text = ANY (p_bang_kiem_mas)
      )
      AND (p_khoa_ids IS NULL OR s.khoa_id = ANY (p_khoa_ids))
      AND (p_khoi_ids IS NULL OR k_t.khoi_id = ANY (p_khoi_ids))
      AND (p_nghe_nghiep_ids IS NULL OR s.nghe_nghiep_id = ANY (p_nghe_nghiep_ids))
      AND (p_khu_vuc_ids IS NULL OR s.khu_vuc_id = ANY (p_khu_vuc_ids));

  SELECT jsonb_build_object(
    'tong_phien', count(DISTINCT s.id),
    'tong_quan_sat', count(r.id),
    'tong_vi_pham', count(r.id) FILTER (WHERE r.value = 'KHONG_DAT'),
    'ty_le_tuan_thu',
    CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END
  )
  INTO v_sum
  FROM _gsc_sessions s
  LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id;

  SELECT jsonb_agg(t) INTO v_khoa FROM (
    SELECT k.id, k.ten_khoa AS ten, count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 50
  ) t;

  SELECT jsonb_agg(t) INTO v_nghe FROM (
    SELECT coalesce(n.id, md5(coalesce(n.ten_nghe_nghiep, 'unknown'))::uuid) AS id, coalesce(n.ten_nghe_nghiep, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_nghe_nghiep n ON s.nghe_nghiep_id = n.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t) INTO v_khu FROM (
    SELECT coalesce(kv.id, md5(coalesce(kv.ten_khu_vuc, 'unknown'))::uuid) AS id, coalesce(kv.ten_khu_vuc, 'Không rõ') AS ten,
           count(r.id) AS tong, count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1, 2 ORDER BY 3 DESC
  ) t;

  SELECT jsonb_agg(t ORDER BY min_date) INTO v_trend FROM (
    SELECT to_char(date_trunc('month', ngay_giam_sat), 'MM/YY') AS label, min(ngay_giam_sat) AS min_date, count(r.id) AS tong,
           count(r.id) FILTER (WHERE r.value = 'DAT') AS dat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le
    FROM _gsc_sessions s
    LEFT JOIN public.v_gsc_dashboard_rows r ON s.id = r.session_id
    GROUP BY 1
  ) t;

  SELECT jsonb_agg(t) INTO v_violation FROM (
    SELECT tc.id AS criterion_id, tc.noi_dung AS ten_tieu_chi, count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') AS so_vi_pham, count(r.id) AS tong_quan_sat,
           CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.value = 'KHONG_DAT')::numeric * 100) / count(r.id), 1) ELSE 0 END AS ty_le_vi_pham
    FROM public.v_gsc_dashboard_rows r
    JOIN public.dm_tieu_chi_bang_kiem tc ON r.criterion_id = tc.id
    JOIN _gsc_sessions s ON r.session_id = s.id
    GROUP BY 1, 2
    HAVING count(r.id) FILTER (WHERE r.value = 'KHONG_DAT') > 0
    ORDER BY 3 DESC LIMIT 20
  ) t;

  SELECT jsonb_agg(t) INTO v_source FROM (
    SELECT 'Khoa KSNK' AS ten, count(DISTINCT id) FILTER (WHERE stype = 'KSNK') AS so_phien FROM _gsc_sessions
    UNION ALL
    SELECT 'Giám sát chéo', count(DISTINCT id) FILTER (WHERE stype = 'CHEO') FROM _gsc_sessions
    UNION ALL
    SELECT 'Tự giám sát', count(DISTINCT id) FILTER (WHERE stype = 'TU_GIAM_SAT') FROM _gsc_sessions
  ) t;

  SELECT jsonb_agg(t) INTO v_part FROM (
    SELECT k.id, k.ten_khoa AS ten, count(DISTINCT s.id) FILTER (WHERE s.stype = 'TU_GIAM_SAT') AS so_phien
    FROM public.dm_khoa_phong k
    LEFT JOIN _gsc_sessions s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoi_ids IS NULL OR k.khoi_id = ANY (p_khoi_ids))
      AND (p_khoa_ids IS NULL OR k.id = ANY (p_khoa_ids))
    GROUP BY 1, 2 ORDER BY 3 ASC, 2 ASC
  ) t;

  RETURN jsonb_build_object(
    'summary', v_sum,
    'by_khoa', coalesce(v_khoa, '[]'::jsonb),
    'by_nghe_nghiep', coalesce(v_nghe, '[]'::jsonb),
    'by_khu_vuc', coalesce(v_khu, '[]'::jsonb),
    'trend', coalesce(v_trend, '[]'::jsonb),
    'violations', coalesce(v_violation, '[]'::jsonb),
    'supervision_sources', coalesce(v_source, '[]'::jsonb),
    'participation', coalesce(v_part, '[]'::jsonb)
  );
END;
$$;
