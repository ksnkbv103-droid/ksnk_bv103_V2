-- Chạy sau migration 20260818001 hoặc theo lịch (cron): làm mới rollup GSC daily.
SELECT public.fn_refresh_mv_gsc_session_daily();
