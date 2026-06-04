-- D-07: DROP gstt_fact_*_summary + sync triggers — read path RPC-only (ADR 2026-06-03, benchmark ~4ms local).
-- Recreate v_gstt_giam_sat_vst_sessions_full aggregates from gstt_fact_vst (no pre-aggregation).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) VST session view — aggregate live from fact (tuân thủ WHO hand-hygiene rule)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
SELECT
  s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat,
  s.created_at, s.updated_at, s.is_active, s.is_seen,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::numeric) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::numeric) AS da_tuan_thu
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT
    d.session_id,
    count(*)::numeric AS tong_co_hoi,
    sum(
      CASE
        WHEN coalesce(btrim(d.hanh_dong), '') IN ('Rửa tay bằng nước', 'Chà tay bằng cồn') THEN 1
        ELSE 0
      END
    )::numeric AS da_tuan_thu
  FROM public.gstt_fact_vst d
  GROUP BY d.session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) DROP sync triggers (VST + GSC)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_vst_opp_insert ON public.gstt_fact_vst;
DROP TRIGGER IF EXISTS trg_sync_vst_opp_delete ON public.gstt_fact_vst;
DROP TRIGGER IF EXISTS trg_sync_vst_opp_update ON public.gstt_fact_vst;
DROP TRIGGER IF EXISTS trg_sync_vst_opp ON public.gstt_fact_vst;
DROP TRIGGER IF EXISTS trg_sync_vst_session ON public.gstt_fact_vst_sessions;

DROP TRIGGER IF EXISTS trg_sync_gsc_session_insert ON public.gstt_fact_chung_sessions;
DROP TRIGGER IF EXISTS trg_sync_gsc_session_delete ON public.gstt_fact_chung_sessions;
DROP TRIGGER IF EXISTS trg_sync_gsc_session_update ON public.gstt_fact_chung_sessions;
DROP TRIGGER IF EXISTS trg_sync_gsc_session ON public.gstt_fact_chung_sessions;

-- ---------------------------------------------------------------------------
-- 3) DROP sync functions
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_opp_insert_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_opp_delete_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_opp_update_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_opp_row() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_vst_session_row() CASCADE;

DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_insert_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_delete_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_update_stmt() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_session_row() CASCADE;
DROP FUNCTION IF EXISTS public.fn_trigger_sync_gsc_result_row() CASCADE;

DROP FUNCTION IF EXISTS public.fn_sync_single_vst_session(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_single_gsc_session(uuid) CASCADE;

-- ---------------------------------------------------------------------------
-- 4) DROP compat views → summary tables
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.fact_gsc_dashboard_summary;
DROP VIEW IF EXISTS public.fact_gsc_violations_summary;
DROP VIEW IF EXISTS public.fact_vst_moments_summary;
DROP VIEW IF EXISTS public.fact_vst_opportunities_summary;
DROP VIEW IF EXISTS public.fact_vst_sessions_summary;

DROP TABLE IF EXISTS public.gstt_fact_gsc_dashboard_summary CASCADE;
DROP TABLE IF EXISTS public.gstt_fact_gsc_violations_summary CASCADE;
DROP TABLE IF EXISTS public.gstt_fact_vst_moments_summary CASCADE;
DROP TABLE IF EXISTS public.gstt_fact_vst_opportunities_summary CASCADE;
DROP TABLE IF EXISTS public.gstt_fact_vst_sessions_summary CASCADE;

NOTIFY pgrst, 'reload schema';

COMMIT;
