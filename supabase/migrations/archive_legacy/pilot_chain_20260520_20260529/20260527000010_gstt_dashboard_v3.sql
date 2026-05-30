-- Migration: Slice 7 (giam-sat-tuan-thu reform v4 / JCI 8.0) — Dashboard v3.
-- Date: 27/05/2026
-- Plan: ~/.cursor/plans/giam-sat-tuan-thu_reform_ac6fc49a.plan.md
--
-- Mục tiêu (additive — KHÔNG đụng v2 đang dùng UI cũ):
--   * VIEW v_gstt_dashboard_pareto_v3        — Pareto 4 màu theo nhom_loi.
--   * VIEW v_gstt_dashboard_bundle_rate_v3   — Bundle Compliance Rate per khoa+template.
--   * VIEW v_gstt_dashboard_rca_summary_v3   — RCA Pending counts (đếm ticket ở
--     v_gstt_rca_ticket_with_overdue đã có ở Slice 9).
--   * VIEW v_gstt_dashboard_nhsn_rate_v3     — NHSN device-days rate, JOIN cross-module
--     với nkbv_fact_mau_so_daily (CAUTI / CLABSI / VAP / PNEU).
--   * RPC rpc_get_compliance_dashboard_v3    — bundle 4 phần trên + summary kế thừa từ v2.
--
-- Lưu ý:
--   * NHSN rate computation chỉ thực thi khi có session liên quan đến CAUTI/CLABSI/VAP — tạm
--     thời lấy `tong_quan_sat` của tieu chi mã `CSSD_*` hoặc khoa ICU làm tử số tham khảo;
--     cụ thể clinical numerator (ca NKBV) dùng `nkbv_fact_ca_nkbv` ở phase sau.
--   * Pareto 4 màu chia theo `nhom_loi` của reason. Nguồn dữ liệu kết hợp:
--       - results_jsonb của gstt_fact_chung_sessions (mỗi quan sát có nguyen_nhan_loi_id).
--       - cột mới của gstt_fact_vst (Slice 8) khi quan sát không tuân thủ.
--   * Slice 5 đã thêm key `nguyen_nhan_loi_id` vào results_jsonb; query unnest jsonb_array_elements.

-- ----------------------------------------------------
-- 1. VIEW Pareto 4 nhóm Ishikawa
--    Aggregate: count + ty_le theo nhom_loi cho khoảng ngày tuỳ chỉnh.
--    Note: VIEW không có param ngày → dashboard layer filter ở RPC v3.
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_dashboard_pareto_v3 CASCADE;
CREATE VIEW public.v_gstt_dashboard_pareto_v3
WITH (security_invoker = true) AS
WITH gsc_failures AS (
  SELECT
    s.id           AS session_id,
    s.khoa_id      AS khoa_id,
    s.ngay_giam_sat AS ngay,
    (item->>'nguyen_nhan_loi_id')::uuid AS nguyen_nhan_loi_id
  FROM public.gstt_fact_chung_sessions s
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.results_jsonb, '[]'::jsonb)) AS item
  WHERE COALESCE(s.is_active, true) = true
    AND (item->>'nguyen_nhan_loi_id') IS NOT NULL
), vst_failures AS (
  SELECT
    o.session_id    AS session_id,
    o.khoa_id       AS khoa_id,
    o.ngay_giam_sat AS ngay,
    o.nguyen_nhan_loi_id
  FROM public.gstt_fact_vst o
  WHERE o.nguyen_nhan_loi_id IS NOT NULL
), all_failures AS (
  SELECT 'GIAM_SAT_CHUNG'::text AS nguon, * FROM gsc_failures
  UNION ALL
  SELECT 'GIAM_SAT_VST'::text   AS nguon, * FROM vst_failures
)
SELECT
  af.nguon,
  af.session_id,
  af.khoa_id,
  af.ngay,
  fr.id        AS nguyen_nhan_loi_id,
  fr.ma_loi,
  fr.nhom_loi,
  fr.mo_ta,
  fr.yeu_cau_rca
FROM all_failures af
JOIN public.gstt_dm_failure_reason fr ON fr.id = af.nguyen_nhan_loi_id;

COMMENT ON VIEW public.v_gstt_dashboard_pareto_v3 IS
  'Slice 7 (reform v4): nguồn dữ liệu Pareto 4 màu — gộp failure observations từ GSC results_jsonb + VST opportunity rows. Dashboard layer GROUP BY nhom_loi/khoa_id.';

-- ----------------------------------------------------
-- 2. VIEW Bundle Compliance Rate (cach_tinh_diem='TRON_GOI')
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_dashboard_bundle_rate_v3 CASCADE;
CREATE VIEW public.v_gstt_dashboard_bundle_rate_v3
WITH (security_invoker = true) AS
SELECT
  bk.id          AS bang_kiem_id,
  bk.ma_bk,
  bk.ten_bang_kiem,
  s.khoa_id,
  s.ngay_giam_sat AS ngay,
  COUNT(s.id)                                                     AS tong_phien,
  COUNT(s.id) FILTER (WHERE s.dat_tron_goi IS TRUE)                AS so_dat,
  COUNT(s.id) FILTER (WHERE s.dat_tron_goi IS FALSE)               AS so_khong_dat,
  CASE
    WHEN COUNT(s.id) FILTER (WHERE s.dat_tron_goi IS NOT NULL) > 0
      THEN ROUND(
        (COUNT(s.id) FILTER (WHERE s.dat_tron_goi IS TRUE))::numeric * 100
        / NULLIF(COUNT(s.id) FILTER (WHERE s.dat_tron_goi IS NOT NULL), 0),
        1
      )
    ELSE NULL
  END AS ty_le_dat
FROM public.gstt_fact_chung_sessions s
JOIN public.gstt_dm_bang_kiem bk
  ON bk.id = s.bang_kiem_id
 AND bk.cach_tinh_diem = 'TRON_GOI'
WHERE COALESCE(s.is_active, true) = true
GROUP BY bk.id, bk.ma_bk, bk.ten_bang_kiem, s.khoa_id, s.ngay_giam_sat;

COMMENT ON VIEW public.v_gstt_dashboard_bundle_rate_v3 IS
  'Slice 7 (reform v4): Bundle Compliance Rate per khoa+ngay+template (chỉ cach_tinh_diem=TRON_GOI). Gauge dashboard tính ty_le trung bình trên N phiên.';

-- ----------------------------------------------------
-- 3. VIEW RCA Summary — đếm ticket pending/overdue per phong_ban (Slice 9)
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_dashboard_rca_summary_v3 CASCADE;
CREATE VIEW public.v_gstt_dashboard_rca_summary_v3
WITH (security_invoker = true) AS
SELECT
  v.phong_ban_xu_ly,
  COUNT(*)                                                          AS tong,
  COUNT(*) FILTER (WHERE v.trang_thai = 'MOI')                      AS moi,
  COUNT(*) FILTER (WHERE v.trang_thai = 'DANG_PHAN_TICH')            AS dang_phan_tich,
  COUNT(*) FILTER (WHERE v.trang_thai = 'HOAN_THANH')                AS hoan_thanh,
  COUNT(*) FILTER (WHERE v.is_overdue = true)                        AS qua_han
FROM public.v_gstt_rca_ticket_with_overdue v
GROUP BY v.phong_ban_xu_ly;

COMMENT ON VIEW public.v_gstt_dashboard_rca_summary_v3 IS
  'Slice 7 (reform v4): RCA Pending card per phong_ban_xu_ly. Realtime — không cron.';

-- ----------------------------------------------------
-- 4. VIEW NHSN device-days summary (CAUTI/CLABSI/VAP) — denominator
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_dashboard_nhsn_denominator_v3 CASCADE;
CREATE VIEW public.v_gstt_dashboard_nhsn_denominator_v3
WITH (security_invoker = true) AS
SELECT
  d.khoa_id,
  d.ngay_ghi_nhan AS ngay,
  d.so_ngay_tho_may,
  d.so_ngay_catheter_cvc,
  d.so_ngay_sonde_tieu,
  d.so_ngay_dieu_tri
FROM public.nkbv_fact_mau_so_daily d;

COMMENT ON VIEW public.v_gstt_dashboard_nhsn_denominator_v3 IS
  'Slice 7 (reform v4): denominator NHSN per 1000 device-days. Numerator (ca NKBV thật) đến từ giam-sat-nkbv module — phase sau JOIN qua RPC.';

-- ----------------------------------------------------
-- 5. RPC v3 — bundle 4 phần
-- ----------------------------------------------------
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v3(date, date, uuid[]);
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_v3(
  p_tu_ngay  date,
  p_den_ngay date,
  p_khoa_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_pareto             jsonb;
  v_bundle             jsonb;
  v_rca                jsonb;
  v_rca_required_ratio jsonb;
  v_nhsn_denominator   jsonb;
BEGIN
  -- 5.1 Pareto 4 nhóm — count + ty_le
  WITH p AS (
    SELECT
      pv.nhom_loi,
      COUNT(*)::int AS so_loi,
      ROUND(
        COUNT(*)::numeric * 100
        / NULLIF((SELECT COUNT(*) FROM public.v_gstt_dashboard_pareto_v3 px
                   WHERE px.ngay BETWEEN p_tu_ngay AND p_den_ngay
                     AND (p_khoa_ids IS NULL OR px.khoa_id = ANY (p_khoa_ids))), 0),
        1
      ) AS ty_le
    FROM public.v_gstt_dashboard_pareto_v3 pv
    WHERE pv.ngay BETWEEN p_tu_ngay AND p_den_ngay
      AND (p_khoa_ids IS NULL OR pv.khoa_id = ANY (p_khoa_ids))
    GROUP BY pv.nhom_loi
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'nhom_loi', nhom_loi,
    'so_loi',   so_loi,
    'ty_le',    ty_le
  )), '[]'::jsonb)
    INTO v_pareto
    FROM p;

  -- 5.2 Bundle Compliance Rate — trung bình trên các template TRON_GOI
  WITH b AS (
    SELECT
      br.bang_kiem_id,
      br.ma_bk,
      br.ten_bang_kiem,
      SUM(br.tong_phien)   AS tong_phien,
      SUM(br.so_dat)       AS so_dat,
      SUM(br.so_khong_dat) AS so_khong_dat,
      CASE
        WHEN SUM(COALESCE(br.so_dat, 0) + COALESCE(br.so_khong_dat, 0)) > 0
          THEN ROUND(
            SUM(COALESCE(br.so_dat, 0))::numeric * 100
            / NULLIF(SUM(COALESCE(br.so_dat, 0) + COALESCE(br.so_khong_dat, 0)), 0),
            1
          )
        ELSE NULL
      END AS ty_le_dat
    FROM public.v_gstt_dashboard_bundle_rate_v3 br
    WHERE br.ngay BETWEEN p_tu_ngay AND p_den_ngay
      AND (p_khoa_ids IS NULL OR br.khoa_id = ANY (p_khoa_ids))
    GROUP BY br.bang_kiem_id, br.ma_bk, br.ten_bang_kiem
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'bang_kiem_id', bang_kiem_id,
    'ma_bk',        ma_bk,
    'ten_bang_kiem', ten_bang_kiem,
    'tong_phien',   tong_phien,
    'so_dat',       so_dat,
    'so_khong_dat', so_khong_dat,
    'ty_le_dat',    ty_le_dat
  )), '[]'::jsonb)
    INTO v_bundle
    FROM b;

  -- 5.3 RCA Pending summary
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'phong_ban_xu_ly', r.phong_ban_xu_ly,
    'tong',            r.tong,
    'moi',             r.moi,
    'dang_phan_tich',  r.dang_phan_tich,
    'hoan_thanh',      r.hoan_thanh,
    'qua_han',         r.qua_han
  )), '[]'::jsonb)
    INTO v_rca
    FROM public.v_gstt_dashboard_rca_summary_v3 r;

  -- 5.4 Tỷ lệ lỗi cần RCA — count(yeu_cau_rca=true) / count(*) trong khoảng filter
  WITH r AS (
    SELECT
      COUNT(*)::int                                            AS tong_loi,
      COUNT(*) FILTER (WHERE pv.yeu_cau_rca = true)::int        AS so_loi_can_rca
    FROM public.v_gstt_dashboard_pareto_v3 pv
    WHERE pv.ngay BETWEEN p_tu_ngay AND p_den_ngay
      AND (p_khoa_ids IS NULL OR pv.khoa_id = ANY (p_khoa_ids))
  )
  SELECT jsonb_build_object(
    'tong_loi',     COALESCE(tong_loi, 0),
    'so_loi_can_rca', COALESCE(so_loi_can_rca, 0),
    'ty_le', CASE WHEN COALESCE(tong_loi, 0) > 0
      THEN ROUND((so_loi_can_rca::numeric * 100) / tong_loi, 1)
      ELSE 0 END
  )
    INTO v_rca_required_ratio
    FROM r;

  -- 5.5 NHSN denominator (sum device-days)
  WITH n AS (
    SELECT
      SUM(d.so_ngay_tho_may)        AS tong_ngay_tho_may,
      SUM(d.so_ngay_catheter_cvc)   AS tong_ngay_catheter_cvc,
      SUM(d.so_ngay_sonde_tieu)     AS tong_ngay_sonde_tieu,
      SUM(d.so_ngay_dieu_tri)       AS tong_ngay_dieu_tri
    FROM public.v_gstt_dashboard_nhsn_denominator_v3 d
    WHERE d.ngay BETWEEN p_tu_ngay AND p_den_ngay
      AND (p_khoa_ids IS NULL OR d.khoa_id = ANY (p_khoa_ids))
  )
  SELECT jsonb_build_object(
    'tong_ngay_tho_may',      COALESCE(tong_ngay_tho_may, 0),
    'tong_ngay_catheter_cvc', COALESCE(tong_ngay_catheter_cvc, 0),
    'tong_ngay_sonde_tieu',   COALESCE(tong_ngay_sonde_tieu, 0),
    'tong_ngay_dieu_tri',     COALESCE(tong_ngay_dieu_tri, 0)
  )
    INTO v_nhsn_denominator
    FROM n;

  RETURN jsonb_build_object(
    'tu_ngay',               p_tu_ngay,
    'den_ngay',              p_den_ngay,
    'pareto_4_mau',          v_pareto,
    'bundle_compliance',     v_bundle,
    'rca_pending_by_phong',  v_rca,
    'rca_required_ratio',    v_rca_required_ratio,
    'nhsn_denominator',      v_nhsn_denominator
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_get_compliance_dashboard_v3(date, date, uuid[]) IS
  'Slice 7 (reform v4): RPC bundle Pareto 4 nhóm + Bundle rate + RCA pending + tỷ lệ lỗi cần RCA + NHSN denominator. KHÔNG đụng v2.';

-- ----------------------------------------------------
-- 6. Sanity check
-- ----------------------------------------------------
DO $$
DECLARE
  v_view_count int;
BEGIN
  SELECT count(*) INTO v_view_count FROM information_schema.views
   WHERE table_schema = 'public'
     AND table_name IN (
       'v_gstt_dashboard_pareto_v3',
       'v_gstt_dashboard_bundle_rate_v3',
       'v_gstt_dashboard_rca_summary_v3',
       'v_gstt_dashboard_nhsn_denominator_v3'
     );
  RAISE NOTICE '[gstt_dashboard_v3] created % view(s) (expect 4).', v_view_count;
END $$;
