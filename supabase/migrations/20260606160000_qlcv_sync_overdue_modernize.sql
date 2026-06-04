-- Modernize fn_sync_overdue_tasks for qlcv_* SSOT + trang_thai TEXT (trigger sync FK).
-- Drop orphan fn_qlcv_analytics_summary (no app consumer).

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_sync_overdue_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH updated_rows AS (
    UPDATE public.qlcv_fact_cong_viec
    SET
      trang_thai = 'QUA_HAN',
      updated_at = NOW()
    WHERE
      han_hoan_thanh IS NOT NULL
      AND han_hoan_thanh < CURRENT_DATE
      AND is_active = true
      AND trang_thai <> ALL (ARRAY['HOAN_THANH', 'DA_HUY', 'QUA_HAN']::text[])
    RETURNING id, phan_tram_hoan_thanh, han_hoan_thanh
  ),
  inserted_hoat_dong AS (
    INSERT INTO public.qlcv_fact_cong_viec_hoat_dong (
      id_cong_viec,
      loai_hoat_dong,
      noi_dung,
      phan_tram_hoan_thanh,
      nguoi_thuc_hien_id
    )
    SELECT
      u.id,
      'CAP_NHAT',
      'Hệ thống tự động: chuyển Quá hạn (hạn chót ' || u.han_hoan_thanh::text || ').',
      COALESCE(u.phan_tram_hoan_thanh, 0),
      NULL
    FROM updated_rows u
    RETURNING id_cong_viec
  )
  SELECT COUNT(*)::integer INTO v_count FROM inserted_hoat_dong;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_overdue_tasks() IS
  'Batch QLCV: set trang_thai=QUA_HAN trên qlcv_fact_cong_viec (trigger sync FK). pg_cron qlcv-sync-overdue-tasks 00:05 VNT.';

DROP FUNCTION IF EXISTS public.fn_qlcv_analytics_summary(uuid);

COMMIT;
