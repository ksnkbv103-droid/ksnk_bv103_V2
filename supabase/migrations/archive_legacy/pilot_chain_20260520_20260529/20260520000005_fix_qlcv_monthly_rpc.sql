-- Fix RPC fn_qlcv_tong_hop_thang by pointing to public.v_fact_cong_viec_full instead of public.fact_cong_viec.
-- The raw fact_cong_viec table does not contain the 'trang_thai' column (only trang_thai_id), causing 'column r.trang_thai does not exist' error.

CREATE OR REPLACE FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date)
 RETURNS TABLE(nhan_su_id uuid, ho_ten text, phieu_trong_thang bigint, hoan_thanh_trong_thang bigint, dung_han bigint, on_time_pct numeric, completion_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_thang::timestamp)::date AS ms_date,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::date AS me_date,
      date_trunc('month', p_thang::timestamp)::timestamptz AS ms_tz,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::timestamptz AS me_tz
  ),
  roots AS (
    SELECT
      cv.*,
      b.ms_tz,
      b.me_tz
    -- Use public.v_fact_cong_viec_full which includes the joined 'trang_thai' textual status code
    FROM public.v_fact_cong_viec_full cv
    CROSS JOIN bounds b
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (
        (cv.created_at >= b.ms_tz AND cv.created_at < b.me_tz)
        OR (cv.updated_at >= b.ms_tz AND cv.updated_at < b.me_tz)
        OR (
          cv.han_hoan_thanh IS NOT NULL
          AND cv.han_hoan_thanh >= b.ms_date
          AND cv.han_hoan_thanh < b.me_date
        )
      )
  ),
  agg AS (
    SELECT
      r.nguoi_phu_trach_id AS sid,
      count(*)::bigint AS phieu_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
      )::bigint AS hoan_thanh_trong_thang,
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.updated_at >= r.ms_tz
          AND r.updated_at < r.me_tz
          AND (r.han_hoan_thanh IS NULL OR r.updated_at::date <= r.han_hoan_thanh)
      )::bigint AS dung_han
    FROM roots r
    GROUP BY r.nguoi_phu_trach_id
  )
  SELECT
    a.sid AS nhan_su_id,
    coalesce(ns.ho_ten, '')::text AS ho_ten,
    a.phieu_trong_thang,
    a.hoan_thanh_trong_thang,
    a.dung_han,
    CASE
      WHEN a.hoan_thanh_trong_thang > 0 THEN round(100.0 * a.dung_han / a.hoan_thanh_trong_thang, 2)
      ELSE 0::numeric
    END AS on_time_pct,
    CASE
      WHEN a.phieu_trong_thang > 0 THEN round(100.0 * a.hoan_thanh_trong_thang / a.phieu_trong_thang, 2)
      ELSE 0::numeric
    END AS completion_pct
  FROM agg a
  LEFT JOIN public.mdm_nhan_su ns ON ns.id = a.sid
  WHERE a.phieu_trong_thang > 0
  ORDER BY completion_pct DESC NULLS LAST, on_time_pct DESC NULLS LAST, ho_ten ASC;
$$;

COMMENT ON FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date) IS 'QLCV: KPI tháng theo người phụ trách — chỉ phiếu gốc; phạm vi = tạo/cập nhật/hạn trong tháng. Đã sửa lỗi tham chiếu cột trang_thai.';
