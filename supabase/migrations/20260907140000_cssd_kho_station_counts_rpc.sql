-- Batch 6.1 — Kho global station / FEFO counts (InventoryDashboard chips).
-- Matches UI filters on v_cssd_quy_trinh_full + red-alert overlay from cssd_fact_su_co.

CREATE OR REPLACE FUNCTION public.rpc_cssd_kho_station_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      q.id,
      t.ma_tram AS ma_trang_thai,
      q.tinh_trang,
      COALESCE(q.is_red_alert, false) AS is_red_alert,
      NULLIF(btrim(q.metadata ->> 'ma_ca_mo_id'), '') AS ma_ca_mo_id,
      (q.han_su_dung AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS han_ymd
    FROM public.cssd_fact_quy_trinh q
    LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.is_active = true
  ),
  red AS (
    SELECT DISTINCT quy_trinh_id
    FROM public.cssd_fact_su_co
    WHERE is_red_alert = true
      AND quy_trinh_id IS NOT NULL
  ),
  today_vn AS (
    SELECT (timezone('Asia/Ho_Chi_Minh', now()))::date AS d
  )
  SELECT jsonb_build_object(
    'dang_xu_ly', count(*) FILTER (
      WHERE ma_trang_thai IN ('LAM_SACH', 'QC', 'DONG_GOI', 'TIET_KHUAN')
    ),
    'san_sang', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT' AND ma_ca_mo_id IS NULL
    ),
    'da_cap', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT' AND ma_ca_mo_id IS NOT NULL
    ),
    'broken', count(*) FILTER (
      WHERE is_red_alert
         OR tinh_trang IN ('HONG', 'MAT')
         OR id IN (SELECT quy_trinh_id FROM red)
    ),
    'fefo_le_7d', count(*) FILTER (
      WHERE ma_trang_thai = 'CAP_PHAT'
        AND han_ymd IS NOT NULL
        AND han_ymd <= (SELECT d FROM today_vn) + 7
    ),
    'total_active', count(*)
  )
  FROM base;
$$;

COMMENT ON FUNCTION public.rpc_cssd_kho_station_counts() IS
  'Kho dụng cụ — đếm toàn cục theo chip InventoryDashboard (đang xử lý / sẵn sàng / đã cấp / sự cố) + FEFO ≤7 ngày VN.';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_station_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_kho_station_counts() TO service_role;
