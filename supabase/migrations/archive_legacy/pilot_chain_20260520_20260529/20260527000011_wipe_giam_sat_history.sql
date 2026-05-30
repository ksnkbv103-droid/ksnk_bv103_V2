-- Slice cleanup: xóa toàn bộ history fact của module giám sát tuân thủ + VST.
--
-- Bối cảnh: Trước khi UAT reform v4 + bộ master data 51 bảng kiểm chuẩn JCI 8.0,
-- chủ trì BV103 yêu cầu wipe sạch toàn bộ history giám sát cũ để bắt đầu trên
-- một nền dữ liệu sạch. Quyết định đã được lưu ở phiên thảo luận 26/05/2026.
--
-- Phạm vi:
--   • CHỈ các bảng fact_* (transactional) — KHÔNG đụng master data.
--   • Master data (`gstt_dm_bang_kiem`, `gstt_dm_tieu_chi_bang_kiem`,
--     `gstt_dm_failure_reason`) GIỮ NGUYÊN.
--
-- Replay-safe: TRUNCATE bảng rỗng không có tác dụng phụ; trigger ON INSERT/UPDATE
-- KHÔNG fire khi TRUNCATE → an toàn cho cả lần đầu lẫn replay sau này.

BEGIN;

-- 1) RCA ticket (đứng riêng, không có dependent)
TRUNCATE TABLE public.gstt_fact_rca_ticket RESTART IDENTITY;

-- 2) VST: child trước (observations) → parent (sessions). Dùng CASCADE để bao
--    hết FK ngầm; pre-aggregation summary cũng wipe luôn vì nguồn rỗng.
TRUNCATE TABLE
  public.gstt_fact_vst,
  public.gstt_fact_vst_sessions,
  public.gstt_fact_vst_moments_summary,
  public.gstt_fact_vst_opportunities_summary,
  public.gstt_fact_vst_sessions_summary
RESTART IDENTITY CASCADE;

-- 3) Giám sát chung: sessions + pre-aggregation summary.
TRUNCATE TABLE
  public.gstt_fact_chung_sessions,
  public.gstt_fact_gsc_dashboard_summary,
  public.gstt_fact_gsc_violations_summary
RESTART IDENTITY CASCADE;

DO $$
DECLARE
  rca_n int; chung_n int; vst_n int; vsts_n int;
BEGIN
  SELECT count(*) INTO rca_n   FROM public.gstt_fact_rca_ticket;
  SELECT count(*) INTO chung_n FROM public.gstt_fact_chung_sessions;
  SELECT count(*) INTO vst_n   FROM public.gstt_fact_vst;
  SELECT count(*) INTO vsts_n  FROM public.gstt_fact_vst_sessions;
  RAISE NOTICE
    '[wipe_giam_sat_history] OK | rca=%, chung_sessions=%, vst=%, vst_sessions=%',
    rca_n, chung_n, vst_n, vsts_n;
END $$;

COMMIT;
