-- Migration: Flatten 3-tier audit log view chain + pg_cron retention 365 ngày.
-- Date: 26/05/2026
-- Slice 7 (admin-module hardening plan).
--
-- Bối cảnh:
--   Sau chuỗi rename 25/05, audit log có chuỗi 3 tầng view:
--     `fact_bv103_audit_log` (view, 000010 line 60)
--        → `sys_fact_audit_log` (view, renamed từ view cũ trong 000010 line 33)
--           → `sys_audit_log` (table, từ 000001 line 10)
--   * Mỗi SELECT phải đi qua 3 lần planner → tăng latency UI Audit trail.
--   * `sys_fact_audit_log` chỉ là alias trung gian, không cần thiết.
--
-- Kết quả mong đợi:
--   1. View `fact_bv103_audit_log` trực tiếp `SELECT * FROM public.sys_audit_log` (1 tầng).
--   2. Drop alias trung gian `sys_fact_audit_log`.
--   3. pg_cron retention: tự xóa audit log > 365 ngày mỗi đêm 03:00 (giảm size table).
--   4. Idempotent + an toàn (kiểm tra extension + table tồn tại).

-- ----------------------------------------------------
-- 1. Flatten view chain
-- ----------------------------------------------------
DO $$
DECLARE
  v_has_intermediate boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'sys_fact_audit_log'
  ) INTO v_has_intermediate;

  IF v_has_intermediate THEN
    -- Re-point fact_bv103_audit_log thẳng đến sys_audit_log
    CREATE OR REPLACE VIEW public.fact_bv103_audit_log WITH (security_invoker='true') AS
    SELECT * FROM public.sys_audit_log;

    DROP VIEW IF EXISTS public.sys_fact_audit_log;
    RAISE NOTICE '[audit-flatten] Đã gỡ view trung gian sys_fact_audit_log; fact_bv103_audit_log → sys_audit_log trực tiếp.';
  ELSE
    -- Trường hợp DB đang ở state khác (chỉ 1 tầng); idempotent đảm bảo view đúng.
    CREATE OR REPLACE VIEW public.fact_bv103_audit_log WITH (security_invoker='true') AS
    SELECT * FROM public.sys_audit_log;
    RAISE NOTICE '[audit-flatten] sys_fact_audit_log không tồn tại, chỉ rebuild fact_bv103_audit_log.';
  END IF;
END $$;

-- ----------------------------------------------------
-- 2. Hàm retention dùng cho cron
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_audit_log_purge(p_retain_days int DEFAULT 365)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => p_retain_days);
  v_count bigint;
BEGIN
  IF p_retain_days < 30 THEN
    RAISE EXCEPTION '[audit-purge] retain_days phải >= 30 (giá trị: %)', p_retain_days;
  END IF;

  DELETE FROM public.sys_audit_log
   WHERE changed_at < v_cutoff;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[audit-purge] cutoff=%, đã xóa % rows', v_cutoff, v_count;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_sys_audit_log_purge(int) IS
  'Xóa audit log cũ hơn p_retain_days (mặc định 365). Chỉ admin/cron gọi.';

-- ----------------------------------------------------
-- 3. Schedule cron job (cần extension pg_cron đã enable)
-- ----------------------------------------------------
DO $$
DECLARE
  v_has_cron boolean;
  v_jobid bigint;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO v_has_cron;

  IF NOT v_has_cron THEN
    RAISE NOTICE '[audit-cron] Extension pg_cron chưa được cài; bỏ qua schedule (chạy DELETE thủ công định kỳ).';
    RETURN;
  END IF;

  -- Bỏ job cũ trùng tên (idempotent)
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'sys_audit_log_retention_purge';

  v_jobid := cron.schedule(
    'sys_audit_log_retention_purge',
    '0 3 * * *',
    $sql$SELECT public.fn_sys_audit_log_purge(365)$sql$
  );

  RAISE NOTICE '[audit-cron] Đã đăng ký job sys_audit_log_retention_purge (id=%) chạy 03:00 hàng ngày.', v_jobid;
END $$;
