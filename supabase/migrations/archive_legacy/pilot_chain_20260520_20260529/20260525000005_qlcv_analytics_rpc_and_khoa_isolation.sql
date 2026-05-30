-- =====================================================================
-- QLCV Sprint 3 — Analytics & Isolation
-- Migration: 20260525000005_qlcv_analytics_rpc_and_khoa_isolation.sql
-- Nội dung:
--   1. RPC fn_qlcv_analytics_summary — analytics server-side
--   2. RPC fn_qlcv_get_actor_khoa — helper lấy khoa_id của actor
-- =====================================================================

-- =====================================================================
-- 1. RPC: fn_qlcv_analytics_summary
--    Tổng hợp analytics QLCV từ server (thay tính trên client-list bị limit)
--    p_khoa_id: lọc theo khoa (NULL = tất cả)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_qlcv_analytics_summary(
  p_khoa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_by_trang_thai  JSONB;
  v_gate_counts    JSONB;
  v_by_assignee    JSONB;
  v_on_time_rate   NUMERIC;
  v_pct_overdue    NUMERIC;
  v_tong           BIGINT;
  v_hoan_thanh     BIGINT;
  v_qua_han        BIGINT;
BEGIN
  -- 1. Đếm theo trạng thái (phiếu gốc, is_active=true)
  SELECT
    jsonb_object_agg(ts.code, cnt.n ORDER BY cnt.n DESC),
    SUM(cnt.n) FILTER (WHERE TRUE),
    SUM(cnt.n) FILTER (WHERE ts.code = 'HOAN_THANH'),
    SUM(cnt.n) FILTER (WHERE ts.code = 'QUA_HAN'
                          OR (cv.han_hoan_thanh < CURRENT_DATE
                              AND ts.code NOT IN ('HOAN_THANH','DA_HUY')))
  INTO v_by_trang_thai, v_tong, v_hoan_thanh, v_qua_han
  FROM (
    SELECT
      cv.trang_thai_id,
      COUNT(*) AS n
    FROM public.fact_cong_viec cv
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.is_active = true
      AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id)
    GROUP BY cv.trang_thai_id
  ) cnt
  JOIN public.fact_cong_viec cv ON TRUE -- bogus join for outer filter
  LEFT JOIN public.dm_lookup_value ts
    ON ts.id = cnt.trang_thai_id AND ts.category_type = 'TRANG_THAI_CONG_VIEC'
  GROUP BY TRUE;

  -- Simpler approach: đếm riêng từng bucket
  SELECT
    jsonb_build_object(
      'TONG', COUNT(*),
      'DANG_LAM', COUNT(*) FILTER (WHERE lv.code IN ('DANG_LAM','DANG_THUC_HIEN','CHO_NHAN_VIEC','CHUA_BAT_DAU')),
      'CHO_DUYET', COUNT(*) FILTER (WHERE lv.code IN ('CHO_DUYET','CHO_XAC_NHAN_HOAN_THANH')),
      'HOAN_THANH', COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
      'QUA_HAN', COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                                     OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY'))),
      'DA_HUY', COUNT(*) FILTER (WHERE lv.code = 'DA_HUY'),
      'MOI', COUNT(*) FILTER (WHERE lv.code = 'MOI')
    )
  INTO v_by_trang_thai
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- Tổng / hoàn thành / quá hạn
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
    COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                       OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY')))
  INTO v_tong, v_hoan_thanh, v_qua_han
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 2. Gate counts (3 cổng)
  SELECT jsonb_build_object(
    'gate_dexuat',   COUNT(*) FILTER (WHERE cv.is_active = false AND lv.code NOT IN ('DA_HUY')),
    'gate_nhan',     COUNT(*) FILTER (WHERE lv.code IN ('CHO_NHAN_VIEC','MOI','CHUA_BAT_DAU') AND cv.is_active = true AND cv.nguoi_phu_trach_id IS NOT NULL),
    'gate_nghiemthu', COUNT(*) FILTER (WHERE lv.code IN ('CHO_DUYET','CHO_XAC_NHAN_HOAN_THANH'))
  )
  INTO v_gate_counts
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 3. By assignee — top 10 theo tổng, loại chưa phân công
  SELECT coalesce(jsonb_agg(t ORDER BY t->>'tong' DESC), '[]'::jsonb)
  INTO v_by_assignee
  FROM (
    SELECT jsonb_build_object(
      'nhan_su_id', cv.nguoi_phu_trach_id,
      'ho_ten', ns.ho_ten,
      'tong', COUNT(*),
      'hoan_thanh', COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'),
      'qua_han', COUNT(*) FILTER (WHERE lv.code = 'QUA_HAN'
                                    OR (cv.han_hoan_thanh < CURRENT_DATE AND lv.code NOT IN ('HOAN_THANH','DA_HUY'))),
      'completion_pct', CASE WHEN COUNT(*) > 0
                              THEN ROUND(COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH')::NUMERIC * 100 / COUNT(*), 1)
                              ELSE 0 END
    ) AS t
    FROM public.fact_cong_viec cv
    LEFT JOIN public.dm_lookup_value lv
      ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
    LEFT JOIN public.mdm_nhan_su ns ON ns.id = cv.nguoi_phu_trach_id
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.is_active = true
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id)
    GROUP BY cv.nguoi_phu_trach_id, ns.ho_ten
    ORDER BY COUNT(*) DESC
    LIMIT 15
  ) sub;

  -- 4. On-time rate (dùng hoan_thanh_luc từ Sprint 1)
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH') > 0
         THEN ROUND(
           COUNT(*) FILTER (
             WHERE lv.code = 'HOAN_THANH'
               AND cv.hoan_thanh_luc IS NOT NULL
               AND (cv.han_hoan_thanh IS NULL OR cv.hoan_thanh_luc::date <= cv.han_hoan_thanh)
           )::NUMERIC * 100 /
           COUNT(*) FILTER (WHERE lv.code = 'HOAN_THANH'), 1)
         ELSE 0
    END
  INTO v_on_time_rate
  FROM public.fact_cong_viec cv
  LEFT JOIN public.dm_lookup_value lv
    ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
  WHERE cv.cong_viec_cha_id IS NULL
    AND cv.is_active = true
    AND (p_khoa_id IS NULL OR cv.khoa_thuc_hien_id = p_khoa_id);

  -- 5. Pct overdue
  v_pct_overdue := CASE WHEN v_tong > 0 THEN ROUND(v_qua_han::NUMERIC * 100 / v_tong, 1) ELSE 0 END;

  RETURN jsonb_build_object(
    'tong',          v_tong,
    'hoan_thanh',    v_hoan_thanh,
    'qua_han',       v_qua_han,
    'on_time_rate',  v_on_time_rate,
    'pct_overdue',   v_pct_overdue,
    'by_trang_thai', COALESCE(v_by_trang_thai, '{}'::jsonb),
    'gate_counts',   COALESCE(v_gate_counts, '{}'::jsonb),
    'by_assignee',   COALESCE(v_by_assignee, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.fn_qlcv_analytics_summary(UUID)
  IS 'Analytics QLCV server-side: đếm theo trạng thái, 3 cổng, top assignee, on-time rate, pct overdue. p_khoa_id=NULL → tất cả khoa.';

-- =====================================================================
-- 2. Helper: fn_qlcv_get_actor_khoa_id(p_nhan_su_id uuid)
--    Trả về khoa_thuc_hien_id của nhân sự để filter multi-tenant
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_qlcv_get_actor_khoa_id(p_nhan_su_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT khoa_id FROM public.mdm_nhan_su WHERE id = p_nhan_su_id LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_qlcv_get_actor_khoa_id(UUID)
  IS 'Trả về khoa_id của nhân sự để áp dụng filter khoa trong QLCV (multi-tenant isolation).';
