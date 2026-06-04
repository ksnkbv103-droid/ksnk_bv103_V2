-- Description: Schedules the daily task spawn and overdue tasks synchronization using pg_cron at 00:01 VNT (17:01 UTC) and 00:05 VNT (17:05 UTC) respectively.
-- Safe check for pg_cron availability.

DO $$
DECLARE
  v_cron_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_exists;

  IF v_cron_exists THEN
    -- 1. Lên lịch tự động sinh việc định kỳ lúc 00:01 VNT (17:01 UTC)
    -- Xóa lịch cũ nếu tồn tại trùng tên
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv-spawn-dinh-ky-daily') THEN
      PERFORM cron.unschedule('qlcv-spawn-dinh-ky-daily');
    END IF;
    
    PERFORM cron.schedule(
      'qlcv-spawn-dinh-ky-daily',
      '1 17 * * *',
      'SELECT public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay();'
    );
    RAISE NOTICE 'pg_cron: Đã lên lịch tự sinh việc định kỳ (qlcv-spawn-dinh-ky-daily) lúc 00:01 VNT hàng ngày.';

    -- 2. Lên lịch tự động cập nhật và đồng bộ trạng thái quá hạn lúc 00:05 VNT (17:05 UTC)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv-sync-overdue-tasks') THEN
      PERFORM cron.unschedule('qlcv-sync-overdue-tasks');
    END IF;

    PERFORM cron.schedule(
      'qlcv-sync-overdue-tasks',
      '5 17 * * *',
      'SELECT public.fn_sync_overdue_tasks();'
    );
    RAISE NOTICE 'pg_cron: Đã lên lịch đồng bộ trạng thái quá hạn (qlcv-sync-overdue-tasks) lúc 00:05 VNT hàng ngày.';

  ELSE
    RAISE NOTICE 'pg_cron extension chưa được cài đặt — bỏ qua lập lịch tự động. Cần gọi các hàm thông qua Server Actions hoặc Edge Functions.';
  END IF;
END $$;
