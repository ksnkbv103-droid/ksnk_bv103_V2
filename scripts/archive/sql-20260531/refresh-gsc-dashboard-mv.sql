-- Làm mới rollup GSC daily (legacy MV — có trong init schema; dashboard hybrid không phụ thuộc bắt buộc).
-- Chỉ chạy nếu vẫn bật cron/MV pre-agg cũ trên môi trường đó.
SELECT public.fn_refresh_mv_gsc_session_daily();
