-- D-07 follow-up: RPC strategic vẫn đọc gstt_fact_*_summary sau DROP bảng — thay bằng VIEW live aggregate.

BEGIN;

-- GSC dashboard (1 row / phiên)
CREATE OR REPLACE VIEW public.gstt_fact_gsc_dashboard_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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

-- GSC violations (1 row / phiên / tiêu chí)
CREATE OR REPLACE VIEW public.gstt_fact_gsc_violations_summary WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  (r.elem ->> 'criterion_id')::uuid AS criterion_id,
  s.ngay_giam_sat,
  s.bang_kiem_id,
  s.khoa_id,
  s.khu_vuc_id,
  s.nghe_nghiep_id,
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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
GROUP BY
  s.id, (r.elem ->> 'criterion_id')::uuid, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id,
  s.khu_vuc_id, s.nghe_nghiep_id, s.nguoi_giam_sat_id, s.created_at;

-- VST opportunities (1 row / cơ hội)
CREATE OR REPLACE VIEW public.gstt_fact_vst_opportunities_summary WITH (security_invoker = true) AS
SELECT
  d.id AS opportunity_id,
  d.session_id,
  s.ngay_giam_sat,
  COALESCE(d.khoa_id, s.khoa_id) AS khoa_id,
  COALESCE(d.khu_vuc_id, s.khu_vuc_id) AS khu_vuc_id,
  d.nghe_nghiep_id,
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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
  public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
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

GRANT SELECT ON public.gstt_fact_gsc_dashboard_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.gstt_fact_gsc_violations_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.gstt_fact_vst_opportunities_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.gstt_fact_vst_sessions_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.gstt_fact_vst_moments_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.fact_gsc_dashboard_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.fact_gsc_violations_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.fact_vst_opportunities_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.fact_vst_sessions_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.fact_vst_moments_summary TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
