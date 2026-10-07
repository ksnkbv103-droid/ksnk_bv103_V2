-- Batch 10 — CSSD perf: station flow counts + waiting Tiếp nhận + đếm mẻ theo máy.
-- Additive RPCs only (SECURITY INVOKER).

-- 1) Đếm theo trạm cho Command Center / bản đồ (không dump 5k dòng).
CREATE OR REPLACE FUNCTION public.rpc_cssd_station_flow_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      q.id,
      t.ma_tram AS station,
      coalesce(q.is_dong_bang, false) AS is_dong_bang,
      coalesce(q.is_red_alert, false) AS is_red_alert
    FROM public.cssd_fact_quy_trinh q
    INNER JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
    WHERE q.is_active = true
      AND nullif(btrim(t.ma_tram), '') IS NOT NULL
  ),
  red AS (
    SELECT DISTINCT quy_trinh_id
    FROM public.cssd_fact_su_co
    WHERE is_red_alert = true
      AND quy_trinh_id IS NOT NULL
  ),
  stations AS (
    SELECT unnest(ARRAY[
      'TIEP_NHAN',
      'LAM_SACH',
      'QC',
      'DONG_GOI',
      'TIET_KHUAN',
      'CAP_PHAT'
    ]::text[]) AS station
  ),
  agg AS (
    SELECT
      b.station,
      count(*)::int AS count,
      count(*) FILTER (
        WHERE b.is_red_alert OR b.id IN (SELECT quy_trinh_id FROM red)
      )::int AS red_alert_count,
      count(*) FILTER (WHERE b.is_dong_bang)::int AS frozen_count
    FROM base b
    GROUP BY b.station
  )
  SELECT jsonb_build_object(
    'cells',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'station', s.station,
            'count', coalesce(a.count, 0),
            'red_alert_count', coalesce(a.red_alert_count, 0),
            'frozen_count', coalesce(a.frozen_count, 0)
          )
          ORDER BY array_position(
            ARRAY[
              'TIEP_NHAN',
              'LAM_SACH',
              'QC',
              'DONG_GOI',
              'TIET_KHUAN',
              'CAP_PHAT'
            ]::text[],
            s.station
          )
        )
        FROM stations s
        LEFT JOIN agg a ON a.station = s.station
      ),
      '[]'::jsonb
    ),
    'red_alert_total', (SELECT coalesce(sum(a.red_alert_count), 0)::int FROM agg a),
    'frozen_total', (SELECT coalesce(sum(a.frozen_count), 0)::int FROM agg a)
  );
$$;

COMMENT ON FUNCTION public.rpc_cssd_station_flow_counts() IS
  'Batch 10 — đếm quy trình active theo trạm + cờ đỏ / đóng băng (Command Center).';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_station_flow_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_station_flow_counts() TO service_role;

-- 2) Hàng chờ Tiếp nhận: bộ active chưa có quy trình active có trạm (mã SET chuẩn).
CREATE OR REPLACE FUNCTION public.rpc_cssd_waiting_tiep_nhan(p_limit integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  ma_bo text,
  ten_bo text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.ma_bo::text,
    b.ten_bo::text,
    b.updated_at
  FROM public.cssd_dm_bo_dung_cu b
  WHERE b.is_active = true
    AND upper(btrim(coalesce(b.ma_bo, ''))) ~ '^[A-Z0-9][A-Z0-9.-]*\.SET\.[0-9]{2,}$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.cssd_fact_quy_trinh q
      WHERE q.bo_dung_cu_id = b.id
        AND q.is_active = true
        AND q.tram_hien_tai_id IS NOT NULL
    )
  ORDER BY b.updated_at DESC NULLS LAST
  LIMIT least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

COMMENT ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer) IS
  'Batch 10 — danh sách chờ Tiếp nhận (anti-join, mã bộ SET, cap 1–500).';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer) TO service_role;

-- 3) Đếm số mẻ tiệt khuẩn theo máy (fleet / QT thiết bị).
CREATE OR REPLACE FUNCTION public.rpc_cssd_thiet_bi_me_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_object_agg(thiet_bi_id::text, so_me),
    '{}'::jsonb
  )
  FROM (
    SELECT thiet_bi_id, count(*)::int AS so_me
    FROM public.cssd_fact_lo_tiet_khuan
    WHERE is_active = true
      AND thiet_bi_id IS NOT NULL
    GROUP BY thiet_bi_id
  ) s;
$$;

COMMENT ON FUNCTION public.rpc_cssd_thiet_bi_me_counts() IS
  'Batch 10 — map thiet_bi_id → số mẻ active (không dump fact).';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_thiet_bi_me_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_thiet_bi_me_counts() TO service_role;
