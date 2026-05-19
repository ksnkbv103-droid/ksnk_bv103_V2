-- Hot-path dashboard views for GSC/NKBV.
-- Goal: move join-heavy projection to DB views for dashboard/list analytics.

CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows
WITH (security_invoker = true) AS
SELECT
  s.id AS session_id,
  s.ngay_giam_sat,
  s.created_at,
  s.loai_bang_kiem,
  s.tong_diem,
  s.khoa_id,
  kp.ten_khoa,
  r.id AS result_id,
  r.value AS result_value
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong kp ON kp.id = s.khoa_id
LEFT JOIN public.fact_giam_sat_chung_results r ON r.session_id = s.id
WHERE s.is_active = true;

GRANT SELECT ON public.v_gsc_dashboard_rows TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_nkbv_ca_full
WITH (security_invoker = true) AS
SELECT
  c.*,
  k.ma_khoa AS khoa_ma,
  k.ten_khoa AS khoa_ten,
  l.ma_loai AS loai_ma,
  l.ten_loai AS loai_ten,
  t.ma_trang_thai AS trang_thai_ma,
  t.ten_trang_thai AS trang_thai_ten
FROM public.fact_giam_sat_nkbv_ca c
LEFT JOIN public.dm_khoa_phong k ON k.id = c.khoa_ghi_nhan_id
LEFT JOIN public.dm_loai_nkbv l ON l.id = c.loai_nkbv_id
LEFT JOIN public.dm_trang_thai_nkbv_ca t ON t.id = c.trang_thai_id;

GRANT SELECT ON public.v_fact_giam_sat_nkbv_ca_full TO authenticated, service_role;
