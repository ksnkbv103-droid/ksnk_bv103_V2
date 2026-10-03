-- Soft-local S-X2: rpc_qlcv_board_counts — TU_CHOI không vào lane CHO_DUYET / cho_toi
-- dù còn 100% và quá hạn (đã từ chối nghiệm thu → làm lại).
-- KHÔNG tự apply — chờ Nghĩa migrate local.

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
      t.nguoi_giao_viec_id,
      coalesce(t.nguoi_phoi_hop_ids, '{}'::uuid[]) AS nguoi_phoi_hop_ids,
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
          AND t.trang_thai IS DISTINCT FROM 'TU_CHOI'
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
      'cho_toi',
      CASE
        WHEN p_actor_staff_id IS NULL THEN 0
        ELSE (
          SELECT count(*)::int FROM base b
          WHERE b.lane IN ('DE_XUAT', 'CHO_DUYET')
            AND (
              b.nguoi_phu_trach_id = p_actor_staff_id
              OR b.nguoi_giao_viec_id = p_actor_staff_id
              OR p_actor_staff_id = ANY (b.nguoi_phoi_hop_ids)
            )
        )
      END,
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
  'Gate/column counts; cho_toi = DE_XUAT|CHO_DUYET ∩ (PT∨PH∨giao). TU_CHOI không vào CHO_DUYET.';

GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO service_role;
