-- GS-05 Soft-local: analytics đọc hinh_thuc_id đã lưu (đóng băng lens).
-- CHỈ GHI FILE — không apply trong lát Cursor. Lead duyệt trước khi migrate.
-- 1) Helper map HT → stype
-- 2) Backfill hinh_thuc_id NULL một lần bằng fn_get_session_stype
-- 3) View summary + VST strategic_impl dùng fn_session_analytics_stype

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_stype_from_hinh_thuc_id(p_hinh_thuc_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT CASE
    WHEN ht.ma_hinh_thuc IN ('HT_CHUYEN_TRACH', 'KSNK', 'HT_KSNK') THEN 'KSNK'
    WHEN ht.ma_hinh_thuc IN ('HT_TU_GIAM_SAT', 'TU_GIAM_SAT', 'HT_TGS') THEN 'TU_GIAM_SAT'
    WHEN ht.ma_hinh_thuc IN ('HT_GIAM_SAT_CHEO', 'CHEO', 'HT_CHEO') THEN 'CHEO'
    WHEN ht.ten_hinh_thuc ILIKE '%chuyên trách%' OR ht.ten_hinh_thuc ILIKE '%khách quan%' THEN 'KSNK'
    WHEN ht.ten_hinh_thuc ILIKE '%tự giám sát%' THEN 'TU_GIAM_SAT'
    WHEN ht.ten_hinh_thuc ILIKE '%chéo%' OR ht.ten_hinh_thuc ILIKE '%cheo%' THEN 'CHEO'
    ELSE NULL
  END
  FROM public.gstt_dm_hinh_thuc_giam_sat ht
  WHERE ht.id = p_hinh_thuc_id
$$;

COMMENT ON FUNCTION public.fn_stype_from_hinh_thuc_id(uuid) IS
  'GS-05: map hinh_thuc_id đã lưu → stype lens (KSNK|TU_GIAM_SAT|CHEO).';

CREATE OR REPLACE FUNCTION public.fn_session_analytics_stype(
  p_hinh_thuc_id uuid,
  p_nguoi_giam_sat_id uuid,
  p_target_khoa_id uuid
) RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_from_ht text;
BEGIN
  IF p_hinh_thuc_id IS NOT NULL THEN
    v_from_ht := public.fn_stype_from_hinh_thuc_id(p_hinh_thuc_id);
    IF v_from_ht IS NOT NULL THEN
      RETURN v_from_ht;
    END IF;
  END IF;
  -- Fallback trước/trong backfill; sau backfill hầu hết có hinh_thuc_id.
  RETURN public.fn_get_session_stype(p_nguoi_giam_sat_id, p_target_khoa_id);
END;
$$;

COMMENT ON FUNCTION public.fn_session_analytics_stype(uuid, uuid, uuid) IS
  'GS-05: ưu tiên hinh_thuc_id đã lưu; fallback fn_get_session_stype.';

-- Backfill một lần — đóng băng lens theo heuristic hiện tại rồi không tính lại từ MDM.
UPDATE public.gstt_fact_vst_sessions s
SET hinh_thuc_id = ht.id
FROM public.gstt_dm_hinh_thuc_giam_sat ht
WHERE s.hinh_thuc_id IS NULL
  AND ht.ten_hinh_thuc = CASE public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id)
    WHEN 'KSNK' THEN 'Giám sát chuyên trách'
    WHEN 'TU_GIAM_SAT' THEN 'Tự giám sát'
    WHEN 'CHEO' THEN 'Giám sát chéo'
    ELSE NULL
  END;

UPDATE public.gstt_fact_chung_sessions s
SET hinh_thuc_id = ht.id
FROM public.gstt_dm_hinh_thuc_giam_sat ht
WHERE s.hinh_thuc_id IS NULL
  AND ht.ten_hinh_thuc = CASE public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id)
    WHEN 'KSNK' THEN 'Giám sát chuyên trách'
    WHEN 'TU_GIAM_SAT' THEN 'Tự giám sát'
    WHEN 'CHEO' THEN 'Giám sát chéo'
    ELSE NULL
  END;

-- --- GSC summary views (strategic + compare matrices) ---
-- FIX-MIG-ORDER: bản cuối GSC (loai_giam_sat + orphan) ở 20261005175100_* — file này chỉ nền stype.
-- GSC strategic stats: tong_quan_sat = tiêu chí áp dụng (value <> 'NA'), không đếm toàn bộ mẫu form.
-- Khớp form (`gsc-score-display`, `giam-sat-scoring` TY_LE) và in ấn "trên tiêu chí có áp dụng".

CREATE OR REPLACE VIEW public.gstt_fact_gsc_dashboard_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  1::bigint AS tong_phien,
  COUNT(r.elem) FILTER (
    WHERE COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
  )::bigint AS tong_quan_sat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'DAT')::bigint AS tong_dat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')::bigint AS tong_vi_pham,
  s.created_at
FROM public.gstt_fact_chung_sessions s
LEFT JOIN LATERAL jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) AS r(elem) ON true
WHERE COALESCE(s.is_active, true) = true
GROUP BY
  s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
  s.nguoi_giam_sat_id, s.created_at;

CREATE OR REPLACE VIEW public.gstt_fact_gsc_violations_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  (r.elem ->> 'criterion_id')::uuid AS criterion_id,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  COUNT(r.elem) FILTER (
    WHERE COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
  )::bigint AS tong_quan_sat,
  COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')::bigint AS tong_vi_pham,
  s.created_at
FROM public.gstt_fact_chung_sessions s
INNER JOIN LATERAL jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) AS r(elem) ON true
WHERE COALESCE(s.is_active, true) = true
  AND r.elem ->> 'criterion_id' IS NOT NULL
  AND COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
GROUP BY
  s.id, (r.elem ->> 'criterion_id')::uuid, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id,
  s.khu_vuc_id, s.nghe_nghiep_id, s.nguoi_giam_sat_id, s.created_at;

CREATE OR REPLACE VIEW public.fact_gsc_dashboard_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_dashboard_summary;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_violations_summary;

NOTIFY pgrst, 'reload schema';

-- --- VST summary views ---
CREATE OR REPLACE VIEW public.gstt_fact_vst_opportunities_summary WITH (security_invoker = true) AS
SELECT
  d.id AS opportunity_id,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
  d.dung_ky_thuat,
  d.du_thoi_gian,
  d.co_deo_gang,
  1::bigint AS so_co_hoi,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
    ELSE 0
  END::bigint AS da_tuan_thu,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0
    ELSE 1
  END::bigint AS bo_sot,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.dung_ky_thuat = false THEN 1
    ELSE 0
  END::bigint AS loi_ky_thuat,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.du_thoi_gian = false THEN 1
    ELSE 0
  END::bigint AS loi_thoi_gian,
  CASE
    WHEN COALESCE(btrim(d.hanh_dong), '') NOT IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.co_deo_gang = true THEN 1
    ELSE 0
  END::bigint AS lam_dung_gang,
  d.created_at
FROM public.gstt_fact_vst d
JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

-- VST sessions (1 row / phiên)
CREATE OR REPLACE VIEW public.gstt_fact_vst_sessions_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.khoa_id,
  s.khu_vuc_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  1::bigint AS tong_phien,
  s.created_at
FROM public.gstt_fact_vst_sessions s
WHERE COALESCE(s.is_active, true) = true;

-- VST moments (split thoi_diem; fallback label khi trống)
CREATE OR REPLACE VIEW public.gstt_fact_vst_moments_summary WITH (security_invoker = true) AS
SELECT
  d.id AS opportunity_id,
  btrim(m.moment_part, E' \t\n\r') AS moment_label,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
  d.co_deo_gang,
  1::bigint AS so_quan_sat,
  d.created_at
FROM public.gstt_fact_vst d
JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
CROSS JOIN LATERAL regexp_split_to_table(
  regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
  E'\\s*,\\s*'
) AS m(moment_part)
WHERE COALESCE(s.is_active, true) = true
  AND btrim(m.moment_part, E' \t\n\r') <> ''

UNION ALL

SELECT
  d.id AS opportunity_id,
  '— Chưa ghi thời điểm trong phiếu'::text AS moment_label,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_session_analytics_stype(s.hinh_thuc_id, s.nguoi_giam_sat_id, s.khoa_id) AS stype,
  s.nguoi_giam_sat_id,
  (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
  d.co_deo_gang,
  1::bigint AS so_quan_sat,
  d.created_at
FROM public.gstt_fact_vst d
JOIN public.gstt_fact_vst_sessions s ON d.session_id = s.id
WHERE COALESCE(s.is_active, true) = true
  AND NOT EXISTS (
    SELECT 1
    FROM regexp_split_to_table(
      regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
      E'\\s*,\\s*'
    ) AS mp(part)
    WHERE btrim(mp.part, E' \t\n\r') <> ''
  );

-- Compat aliases (RPC baseline / legacy)
CREATE OR REPLACE VIEW public.fact_gsc_dashboard_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_dashboard_summary;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_violations_summary;

CREATE OR REPLACE VIEW public.fact_vst_opportunities_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_vst_opportunities_summary;

CREATE OR REPLACE VIEW public.fact_vst_sessions_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_vst_sessions_summary;

CREATE OR REPLACE VIEW public.fact_vst_moments_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_vst_moments_summary;


-- --- VST strategic analytics_impl (session_base) ---
-- gap_analysis: dùng opp_filtered (tôn trọng p_hinh_thuc_ids) thay vì opp_core.

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl(
  p_tu_ngay date,
  p_den_ngay date,
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
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 0
        ELSE 1
      END::bigint AS bo_sot,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.dung_ky_thuat = false THEN 1
        ELSE 0
      END::bigint AS loi_ky_thuat,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.du_thoi_gian = false THEN 1
        ELSE 0
      END::bigint AS loi_thoi_gian,
      CASE
        WHEN COALESCE(btrim(d.hanh_dong), '') NOT IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') AND d.co_deo_gang = true THEN 1
        ELSE 0
      END::bigint AS lam_dung_gang,
      ss.khoi_id,
      ss.ma_khoa,
      ss.ten_khoa
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
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
      AND btrim(m.moment_part, E' \t\n\r') <> ''

    UNION ALL

    SELECT
      '— Chưa ghi thời điểm trong phiếu'::text AS moment_label,
      (COALESCE(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn')) AS is_tuan_thu,
      1::bigint AS so_quan_sat
    FROM public.gstt_fact_vst d
    INNER JOIN session_scoped ss ON d.session_id = ss.session_id
    WHERE (p_hinh_thuc_ids IS NULL OR ss.stype = ANY(p_hinh_thuc_ids))
      AND (p_nghe_nghiep_ids IS NULL OR d.nghe_nghiep_id = ANY(p_nghe_nghiep_ids))
      AND NOT EXISTS (
        SELECT 1
        FROM regexp_split_to_table(
          regexp_replace(COALESCE(d.thoi_diem, ''), '，', ',', 'g'),
          E'\\s*,\\s*'
        ) AS m2(moment_part)
        WHERE btrim(m2.moment_part, E' \t\n\r') <> ''
      )
  ),
  opp_window AS MATERIALIZED (
    SELECT COALESCE(d.khoa_id, sb.khoa_id) AS khoa_id, sb.stype, 1::bigint AS so_co_hoi
    FROM public.gstt_fact_vst d
    INNER JOIN session_base sb ON d.session_id = sb.session_id
  ),
  kpis AS (
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
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
      FROM opp_filtered
      GROUP BY 1
    ) t
  ),
  matrix_khoa AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY ty_le_tuan_thu DESC), '[]'::jsonb) AS payload
    FROM (
      SELECT
        khoa_id AS id,
        ma_khoa,
        ten_khoa AS ten,
        SUM(so_co_hoi) AS tong_co_hoi,
        SUM(da_tuan_thu) AS da_tuan_thu,
        CASE WHEN SUM(so_co_hoi) > 0 THEN ROUND((SUM(da_tuan_thu)::numeric * 100) / SUM(so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
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
        CASE WHEN SUM(s.so_co_hoi) > 0 THEN ROUND((SUM(s.da_tuan_thu)::numeric * 100) / SUM(s.so_co_hoi), 1) ELSE 0 END AS ty_le_tuan_thu
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
          ELSE 0 END AS ty_le_tuan_thu
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
    'kpis', COALESCE((SELECT payload FROM kpis), '{}'::jsonb),
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
$$;


NOTIFY pgrst, 'reload schema';

COMMIT;
