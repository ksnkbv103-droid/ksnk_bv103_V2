-- Update fn_qlcv_tong_hop_thang to filter/classify task extensions and task cancellations for KPI scoring.

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
  with_deadlines AS (
    SELECT
      r.*,
      EXISTS (
        SELECT 1
        FROM public.fact_cong_viec_hoat_dong h
        LEFT JOIN public.v_auth_user_permissions p ON p.staff_id = h.nguoi_thuc_hien_id
        WHERE h.id_cong_viec = r.id
          AND h.loai_hoat_dong = 'GIA_HAN'
          AND (
            h.nguoi_thuc_hien_id != r.nguoi_phu_trach_id
            OR p.roles ? 'ADMIN'
          )
      ) AS has_valid_extension,
      (
        SELECT (substring(h.noi_dung from 'từ ([0-9]{4}-[0-9]{2}-[0-9]{2})'))::date
        FROM public.fact_cong_viec_hoat_dong h
        WHERE h.id_cong_viec = r.id
          AND h.loai_hoat_dong = 'GIA_HAN'
        ORDER BY h.created_at ASC
        LIMIT 1
      ) AS original_deadline_from_log
    FROM roots r
  ),
  with_approved_deadline AS (
    SELECT
      wd.*,
      CASE
        WHEN wd.has_valid_extension THEN wd.han_hoan_thanh
        ELSE COALESCE(wd.original_deadline_from_log, wd.han_hoan_thanh)
      END AS approved_deadline
    FROM with_deadlines wd
  ),
  with_canceller AS (
    SELECT
      wad.*,
      (
        SELECT h.nguoi_thuc_hien_id
        FROM public.fact_cong_viec_hoat_dong h
        WHERE h.id_cong_viec = wad.id
          AND (h.noi_dung LIKE 'Hủy%' OR h.noi_dung LIKE 'Hủy do không đạt%')
        ORDER BY h.created_at DESC
        LIMIT 1
      ) AS canceller_staff_id
    FROM with_approved_deadline wad
  ),
  with_canceller_roles AS (
    SELECT
      wc.*,
      EXISTS (
        SELECT 1
        FROM public.v_auth_user_permissions p
        WHERE p.staff_id = wc.canceller_staff_id
          AND p.roles ? 'ADMIN'
      ) AS is_canceller_admin
    FROM with_canceller wc
  ),
  with_penalized AS (
    SELECT
      wcr.*,
      CASE
        WHEN wcr.trang_thai = 'DA_HUY' THEN
          (wcr.approved_deadline IS NOT NULL AND wcr.updated_at::date > wcr.approved_deadline)
          OR
          (wcr.canceller_staff_id = wcr.nguoi_phu_trach_id AND NOT wcr.is_canceller_admin)
        ELSE false
      END AS is_penalized_cancellation
    FROM with_canceller_roles wcr
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
          AND (r.approved_deadline IS NULL OR r.updated_at::date <= r.approved_deadline)
      )::bigint AS dung_han
    FROM with_penalized r
    WHERE (r.trang_thai != 'DA_HUY' OR r.is_penalized_cancellation = true)
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

COMMENT ON FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date) IS 'QLCV: KPI tháng theo người phụ trách — chỉ phiếu gốc; có phân loại gia hạn & hủy phạt.';
