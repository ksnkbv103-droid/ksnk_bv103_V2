-- Batch 12 — QLCV perf: board gate/column counts + nhiệm vụ rollup.
-- Recovered from live prod (cvzwslpxwgqiugzzhqej) migration history
-- version 20260909030202 / name qlcv_perf_batch12_rpcs.
-- Additive RPCs only (SECURITY INVOKER default). Idempotent via CREATE OR REPLACE.
-- Do NOT re-apply to prod if already in schema_migrations.

-- 1) Gate + column counts for Điều hành chips (SSOT — không đếm client slice).
CREATE OR REPLACE FUNCTION public.rpc_qlcv_board_counts(p_actor_staff_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      t.id,
      t.trang_thai,
      t.is_active,
      coalesce(t.phan_tram_hoan_thanh, 0) AS pct,
      t.loai_cong_viec,
      coalesce(t.is_qua_han, false) AS is_qua_han,
      t.han_hoan_thanh,
      t.nguoi_phu_trach_id,
      t.nguoi_tao_id,
      CASE
        WHEN t.trang_thai = 'DA_HUY' THEN 'DA_HUY'
        WHEN t.trang_thai = 'HOAN_THANH' THEN 'HOAN_THANH'
        WHEN coalesce(t.is_active, true) = false
          AND (
            t.trang_thai = 'DE_XUAT_CHO_DUYET'
            OR t.trang_thai = 'MOI'
          ) THEN 'DE_XUAT'
        WHEN t.loai_cong_viec IS DISTINCT FROM 'DINH_KY'
          AND t.trang_thai IS DISTINCT FROM 'HOAN_THANH'
          AND t.trang_thai IS DISTINCT FROM 'DA_HUY'
          AND (
            t.trang_thai = 'CHO_DUYET'
            OR (
              coalesce(t.phan_tram_hoan_thanh, 0) >= 100
              AND (
                t.trang_thai IN ('DANG_LAM', 'QUA_HAN')
                OR coalesce(t.is_qua_han, false) = true
                OR (
                  t.han_hoan_thanh IS NOT NULL
                  AND (t.han_hoan_thanh::date < CURRENT_DATE)
                )
              )
            )
          ) THEN 'CHO_DUYET'
        WHEN coalesce(t.is_active, true) = true THEN 'DANG_LAM'
        ELSE NULL
      END AS lane
    FROM public.v_qlcv_cong_viec_full t
  ),
  active AS (
    SELECT * FROM base WHERE is_active = true AND lane IS NOT NULL
  )
  SELECT jsonb_build_object(
    'columns',
    jsonb_build_object(
      'DANG_LAM', (SELECT count(*)::int FROM active WHERE lane = 'DANG_LAM'),
      'CHO_DUYET', (SELECT count(*)::int FROM active WHERE lane = 'CHO_DUYET'),
      'HOAN_THANH', (SELECT count(*)::int FROM active WHERE lane = 'HOAN_THANH'),
      'DA_HUY', (SELECT count(*)::int FROM active WHERE lane = 'DA_HUY'),
      'DE_XUAT', (SELECT count(*)::int FROM base WHERE lane = 'DE_XUAT')
    ),
    'gates',
    jsonb_build_object(
      'in_progress', (SELECT count(*)::int FROM active WHERE lane = 'DANG_LAM'),
      'overdue', (
        SELECT count(*)::int FROM active a
        WHERE a.lane IS DISTINCT FROM 'HOAN_THANH'
          AND a.lane IS DISTINCT FROM 'DA_HUY'
          AND (
            a.trang_thai = 'QUA_HAN'
            OR a.is_qua_han = true
            OR (
              a.han_hoan_thanh IS NOT NULL
              AND (a.han_hoan_thanh::date < CURRENT_DATE)
            )
          )
      ),
      'cho_toi', (
        SELECT count(*)::int FROM base b
        WHERE b.lane IN ('DE_XUAT', 'CHO_DUYET')
      ),
      'my_tasks',
      CASE
        WHEN p_actor_staff_id IS NULL THEN 0
        ELSE (
          SELECT count(*)::int FROM base b
          WHERE b.lane IS DISTINCT FROM 'HOAN_THANH'
            AND b.lane IS DISTINCT FROM 'DA_HUY'
            AND (
              b.nguoi_phu_trach_id = p_actor_staff_id
              OR (
                b.lane = 'DE_XUAT'
                AND b.nguoi_tao_id = p_actor_staff_id
              )
            )
        )
      END
    )
  );
$function$;

COMMENT ON FUNCTION public.rpc_qlcv_board_counts(uuid) IS
  'Batch 12 — SSOT gate/column counts for QLCV Điều hành (in_progress, overdue, cho_toi, my_tasks).';

GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO service_role;

-- 2) Nhiệm vụ progress rollup from linked active tasks.
CREATE OR REPLACE FUNCTION public.rpc_qlcv_nhiem_vu_rollup(p_nhiem_vu_ids uuid[])
RETURNS TABLE(nhiem_vu_id uuid, pct integer, task_count integer, task_done_count integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    t.nhiem_vu_id,
    CASE
      WHEN count(*) = 0 THEN 0
      ELSE round(avg(coalesce(t.phan_tram_hoan_thanh, 0)))::integer
    END AS pct,
    count(*)::integer AS task_count,
    count(*) FILTER (WHERE t.trang_thai = 'HOAN_THANH')::integer AS task_done_count
  FROM public.v_qlcv_cong_viec_full t
  WHERE t.is_active = true
    AND t.nhiem_vu_id = ANY (p_nhiem_vu_ids)
  GROUP BY t.nhiem_vu_id;
$function$;

COMMENT ON FUNCTION public.rpc_qlcv_nhiem_vu_rollup(uuid[]) IS
  'Batch 12 — avg % + task counts per nhiệm vụ (active linked phiếu).';

GRANT EXECUTE ON FUNCTION public.rpc_qlcv_nhiem_vu_rollup(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_qlcv_nhiem_vu_rollup(uuid[]) TO service_role;
