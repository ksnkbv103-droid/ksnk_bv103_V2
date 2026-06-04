-- GSC strategic stats: tong_quan_sat = tiêu chí áp dụng (value <> 'NA'), không đếm toàn bộ mẫu form.
-- Khớp form (`gsc-score-display`, `giam-sat-scoring` TY_LE) và in ấn "trên tiêu chí có áp dụng".

BEGIN;

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
  AND COALESCE(r.elem ->> 'value', '') NOT IN ('NA', '')
GROUP BY
  s.id, (r.elem ->> 'criterion_id')::uuid, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id,
  s.khu_vuc_id, s.nghe_nghiep_id, s.nguoi_giam_sat_id, s.created_at;

CREATE OR REPLACE VIEW public.fact_gsc_dashboard_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_dashboard_summary;

CREATE OR REPLACE VIEW public.fact_gsc_violations_summary WITH (security_invoker = true) AS
  SELECT * FROM public.gstt_fact_gsc_violations_summary;

NOTIFY pgrst, 'reload schema';

COMMIT;
