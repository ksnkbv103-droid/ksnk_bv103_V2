-- Migration: 20261105120200_qlcv_board_counts_exclude_null_lane.sql
-- Lát B1 / việc 3. rpc_qlcv_board_counts (20261104120000): gate `my_tasks` và `watching` đếm trên CTE `base`
-- (cả hàng is_active=false không phải đề xuất → lane NULL: xóa mềm, TU_CHOI đã ẩn…) trong khi danh sách thật
-- (getCongViecListForBoard: is_active=true + đề xuất chờ duyệt) không có các hàng này → thẻ «Tôi theo dõi» = 1, danh sách rỗng.
-- Sửa: thêm `b.lane IS NOT NULL` cho my_tasks và watching. lane NOT NULL = (is_active=true) ∪ (đề xuất MOI/DE_XUAT_CHO_DUYET),
-- khớp tập mergedTasks phía client. TU_CHOI còn is_active=true vẫn hiện trong danh sách (isQlcvClosed chỉ loại HOAN_THANH/DA_HUY)
-- nên vẫn được đếm — giữ nguyên để khớp. Các phần khác giữ nguyên, chữ ký giữ nguyên.

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
      coalesce(t.nguoi_theo_doi_ids, '{}'::uuid[]) AS nguoi_theo_doi_ids,
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
                  AND (t.han_hoan_thanh::date < public.fn_qlcv_today_vn())
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
              AND (a.han_hoan_thanh::date < public.fn_qlcv_today_vn())
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
          WHERE b.lane IS NOT NULL
            AND b.lane IS DISTINCT FROM 'HOAN_THANH'
            AND b.lane IS DISTINCT FROM 'DA_HUY'
            AND (
              b.nguoi_phu_trach_id = p_actor_staff_id
              OR p_actor_staff_id = ANY (b.nguoi_phoi_hop_ids)
              OR (
                b.lane = 'DE_XUAT'
                AND b.nguoi_tao_id = p_actor_staff_id
              )
            )
        )
      END,
      'watching',
      CASE
        WHEN p_actor_staff_id IS NULL THEN 0
        ELSE (
          SELECT count(*)::int FROM base b
          WHERE b.lane IS NOT NULL
            AND b.lane IS DISTINCT FROM 'HOAN_THANH'
            AND b.lane IS DISTINCT FROM 'DA_HUY'
            AND p_actor_staff_id = ANY (b.nguoi_theo_doi_ids)
        )
      END
    )
  );
$function$;

COMMENT ON FUNCTION public.rpc_qlcv_board_counts(uuid) IS
  'Gate/column counts; my_tasks bao gồm cả người phối hợp; watching đếm người theo dõi; my_tasks/watching loại hàng lane NULL (xóa mềm/TU_CHOI ẩn); quá hạn theo fn_qlcv_today_vn().';

GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_qlcv_board_counts(uuid) TO service_role;

-- CHƯA APPLY PROD — chờ PO. Phụ thuộc 20261104120000.
-- Kiểm prod (chỉ đọc), mong đợi t:
--   SELECT pg_get_functiondef('public.rpc_qlcv_board_counts(uuid)'::regprocedure) LIKE '%WHERE b.lane IS NOT NULL%';
