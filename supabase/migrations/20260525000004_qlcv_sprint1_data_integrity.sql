-- =====================================================================
-- QLCV Sprint 1 — Data Integrity
-- Migration: 20260525000004_qlcv_sprint1_data_integrity.sql
-- Nội dung:
--   1. Thêm cột hoan_thanh_luc, gia_han_so_lan vào fact_cong_viec
--   2. Trigger fn_set_hoan_thanh_luc — set timestamp khi HOAN_THANH, reset khi làm lại
--   3. Trigger fn_inc_gia_han_so_lan — tăng counter khi gia hạn (han_hoan_thanh tăng)
--   4. RPC fn_sync_overdue_tasks() — batch UPDATE + bulk INSERT (thay N+1)
--   5. Fix fn_qlcv_tong_hop_thang — dùng hoan_thanh_luc thay updated_at
--   6. Cập nhật v_fact_cong_viec_full — expose hoan_thanh_luc, gia_han_so_lan
--   7. pg_cron schedule fn_sync_overdue_tasks (00:05 VNT hàng ngày)
-- =====================================================================

-- =====================================================================
-- 1. Thêm cột mới vào fact_cong_viec
-- =====================================================================

ALTER TABLE public.fact_cong_viec
  ADD COLUMN IF NOT EXISTS hoan_thanh_luc TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gia_han_so_lan INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.fact_cong_viec.hoan_thanh_luc
  IS 'Timestamp chính xác khi công việc được nghiệm thu (trang_thai → HOAN_THANH). Reset về NULL nếu bị trả làm lại. Dùng cho KPI đúng hạn thay vì updated_at.';

COMMENT ON COLUMN public.fact_cong_viec.gia_han_so_lan
  IS 'Số lần hạn hoàn thành đã bị gia hạn (han_hoan_thanh bị dời sang ngày sau). Audit trail không xóa được qua history.';

-- =====================================================================
-- 2. Trigger: fn_set_hoan_thanh_luc
--    Set hoan_thanh_luc khi trang_thai_id → HOAN_THANH
--    Reset khi chuyển sang trạng thái khác (làm lại / từ chối)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_set_hoan_thanh_luc()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_ma_moi TEXT;
  v_ma_cu  TEXT;
BEGIN
  -- Chỉ xử lý khi trang_thai_id thay đổi
  IF OLD.trang_thai_id IS NOT DISTINCT FROM NEW.trang_thai_id THEN
    RETURN NEW;
  END IF;

  -- Resolve mã trạng thái mới
  SELECT code INTO v_ma_moi
  FROM public.dm_lookup_value
  WHERE id = NEW.trang_thai_id AND category_type = 'TRANG_THAI_CONG_VIEC'
  LIMIT 1;

  -- Resolve mã trạng thái cũ
  SELECT code INTO v_ma_cu
  FROM public.dm_lookup_value
  WHERE id = OLD.trang_thai_id AND category_type = 'TRANG_THAI_CONG_VIEC'
  LIMIT 1;

  IF v_ma_moi = 'HOAN_THANH' AND COALESCE(v_ma_cu, '') <> 'HOAN_THANH' THEN
    -- Chuyển vào HOAN_THANH → ghi timestamp
    NEW.hoan_thanh_luc := NOW();
  ELSIF v_ma_moi <> 'HOAN_THANH' AND COALESCE(v_ma_cu, '') = 'HOAN_THANH' THEN
    -- Rời khỏi HOAN_THANH (bị trả làm lại) → xóa timestamp
    NEW.hoan_thanh_luc := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_hoan_thanh_luc ON public.fact_cong_viec;
CREATE TRIGGER trg_set_hoan_thanh_luc
  BEFORE UPDATE ON public.fact_cong_viec
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_hoan_thanh_luc();

COMMENT ON FUNCTION public.fn_set_hoan_thanh_luc()
  IS 'Tự động set/reset hoan_thanh_luc khi fact_cong_viec chuyển sang/rời HOAN_THANH.';

-- =====================================================================
-- 3. Trigger: fn_inc_gia_han_so_lan
--    Tăng gia_han_so_lan khi han_hoan_thanh thay đổi sang ngày LỚN HƠN
--    (chỉ tính gia hạn thực sự, không tính khi đặt lần đầu hoặc rút ngắn hạn)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_inc_gia_han_so_lan()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Chỉ tăng khi:
  --   1. han_hoan_thanh thực sự thay đổi
  --   2. Hạn mới > hạn cũ (gia hạn, không phải rút ngắn)
  --   3. Hạn cũ không NULL (không tính khi set hạn lần đầu)
  IF OLD.han_hoan_thanh IS NOT NULL
     AND NEW.han_hoan_thanh IS NOT NULL
     AND NEW.han_hoan_thanh > OLD.han_hoan_thanh
  THEN
    NEW.gia_han_so_lan := COALESCE(OLD.gia_han_so_lan, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_gia_han_so_lan ON public.fact_cong_viec;
CREATE TRIGGER trg_inc_gia_han_so_lan
  BEFORE UPDATE ON public.fact_cong_viec
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_inc_gia_han_so_lan();

COMMENT ON FUNCTION public.fn_inc_gia_han_so_lan()
  IS 'Tự động tăng gia_han_so_lan khi han_hoan_thanh bị dời sang ngày xa hơn (gia hạn thực sự).';

-- =====================================================================
-- 4. RPC: fn_sync_overdue_tasks()
--    Batch UPDATE fact_cong_viec → QUA_HAN + bulk INSERT hoat_dong
--    Thay thế N+1 loop trong syncOverdueTasks action (Server Action)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_overdue_tasks()
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_qua_han_id   UUID;
  v_hoan_thanh_id UUID;
  v_da_huy_id    UUID;
  v_count        INTEGER := 0;
BEGIN
  -- Resolve trạng thái IDs
  SELECT id INTO v_qua_han_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'QUA_HAN'
  LIMIT 1;

  SELECT id INTO v_hoan_thanh_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'HOAN_THANH'
  LIMIT 1;

  SELECT id INTO v_da_huy_id
  FROM public.dm_lookup_value
  WHERE category_type = 'TRANG_THAI_CONG_VIEC' AND code = 'DA_HUY'
  LIMIT 1;

  IF v_qua_han_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy trạng thái QUA_HAN trong dm_lookup_value (category_type=TRANG_THAI_CONG_VIEC).';
  END IF;

  -- Batch UPDATE: tất cả công việc quá hạn chưa kết thúc
  WITH updated_rows AS (
    UPDATE public.fact_cong_viec
    SET
      trang_thai_id = v_qua_han_id,
      updated_at    = NOW()
    WHERE
      han_hoan_thanh < CURRENT_DATE
      AND is_active = true
      AND trang_thai_id IS DISTINCT FROM v_qua_han_id
      AND (v_hoan_thanh_id IS NULL OR trang_thai_id IS DISTINCT FROM v_hoan_thanh_id)
      AND (v_da_huy_id    IS NULL OR trang_thai_id IS DISTINCT FROM v_da_huy_id)
    RETURNING id, phan_tram_hoan_thanh, han_hoan_thanh
  ),
  -- Bulk INSERT hoạt động
  inserted_hoat_dong AS (
    INSERT INTO public.fact_cong_viec_hoat_dong (
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
      NULL -- system actor
    FROM updated_rows u
    RETURNING id_cong_viec
  )
  SELECT COUNT(*) INTO v_count FROM inserted_hoat_dong;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_overdue_tasks()
  IS 'Batch đồng bộ trạng thái QUA_HAN cho tất cả công việc quá hạn (batch UPDATE + bulk INSERT hoạt động). Idempotent. Gọi bởi pg_cron hoặc Server Action.';

-- =====================================================================
-- 5. Fix fn_qlcv_tong_hop_thang — dùng hoan_thanh_luc thay updated_at
--    (dung_han: hoàn thành đúng hạn theo timestamp nghiệm thu thực tế)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_qlcv_tong_hop_thang(p_thang date)
  RETURNS TABLE(
    nhan_su_id            uuid,
    ho_ten                text,
    phieu_trong_thang     bigint,
    hoan_thanh_trong_thang bigint,
    dung_han              bigint,
    on_time_pct           numeric,
    completion_pct        numeric
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_thang::timestamp)::date                          AS ms_date,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::date  AS me_date,
      date_trunc('month', p_thang::timestamp)::timestamptz                  AS ms_tz,
      (date_trunc('month', p_thang::timestamp) + interval '1 month')::timestamptz AS me_tz
  ),
  roots AS (
    SELECT
      cv.*,
      lv.code AS trang_thai,
      b.ms_date,
      b.me_date,
      b.ms_tz,
      b.me_tz
    FROM public.fact_cong_viec cv
    CROSS JOIN bounds b
    LEFT JOIN public.dm_lookup_value lv
      ON lv.id = cv.trang_thai_id AND lv.category_type = 'TRANG_THAI_CONG_VIEC'
    WHERE cv.cong_viec_cha_id IS NULL
      AND cv.nguoi_phu_trach_id IS NOT NULL
      AND (
        (cv.created_at  >= b.ms_tz AND cv.created_at  < b.me_tz)
        OR (cv.updated_at >= b.ms_tz AND cv.updated_at < b.me_tz)
        OR (
          cv.han_hoan_thanh IS NOT NULL
          AND cv.han_hoan_thanh >= b.ms_date
          AND cv.han_hoan_thanh <  b.me_date
        )
        OR (
          -- Phiếu hoàn thành trong tháng (theo timestamp nghiệm thu)
          cv.hoan_thanh_luc IS NOT NULL
          AND cv.hoan_thanh_luc >= b.ms_tz
          AND cv.hoan_thanh_luc <  b.me_tz
        )
      )
  ),
  agg AS (
    SELECT
      r.nguoi_phu_trach_id AS sid,
      count(*)::bigint AS phieu_trong_thang,
      -- Hoàn thành: dùng hoan_thanh_luc (timestamp nghiệm thu thực tế)
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.hoan_thanh_luc IS NOT NULL
          AND r.hoan_thanh_luc >= r.ms_tz
          AND r.hoan_thanh_luc <  r.me_tz
      )::bigint AS hoan_thanh_trong_thang,
      -- Đúng hạn: hoan_thanh_luc <= cuối ngày hạn chót
      count(*) FILTER (
        WHERE r.trang_thai = 'HOAN_THANH'
          AND r.hoan_thanh_luc IS NOT NULL
          AND r.hoan_thanh_luc >= r.ms_tz
          AND r.hoan_thanh_luc <  r.me_tz
          AND (
            r.han_hoan_thanh IS NULL
            OR r.hoan_thanh_luc::date <= r.han_hoan_thanh
          )
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
      WHEN a.hoan_thanh_trong_thang > 0
        THEN round(100.0 * a.dung_han / a.hoan_thanh_trong_thang, 2)
      ELSE 0::numeric
    END AS on_time_pct,
    CASE
      WHEN a.phieu_trong_thang > 0
        THEN round(100.0 * a.hoan_thanh_trong_thang / a.phieu_trong_thang, 2)
      ELSE 0::numeric
    END AS completion_pct
  FROM agg a
  LEFT JOIN public.mdm_nhan_su ns ON ns.id = a.sid
  WHERE a.phieu_trong_thang > 0
  ORDER BY completion_pct DESC NULLS LAST, on_time_pct DESC NULLS LAST, ho_ten ASC;
$$;

COMMENT ON FUNCTION public.fn_qlcv_tong_hop_thang(date)
  IS 'QLCV: KPI tháng theo người phụ trách — dùng hoan_thanh_luc (timestamp nghiệm thu thực tế) thay updated_at để tính đúng hạn. Phạm vi: phiếu gốc tạo/cập nhật/hạn/hoàn thành trong tháng.';

-- =====================================================================
-- 6. Cập nhật v_fact_cong_viec_full — expose hoan_thanh_luc, gia_han_so_lan
-- =====================================================================

-- Drop và recreate để thêm 2 cột mới vào view
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_cong_viec_full
  WITH (security_invoker = 'true')
AS
SELECT
  cv.id,
  cv.cong_viec_cha_id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec_id,
  lc.code                                                         AS loai_cong_viec,
  lc.name                                                         AS ten_loai_cong_viec,
  cv.trang_thai_id,
  ts.code                                                         AS trang_thai,
  ts.name                                                         AS ten_trang_thai_hien_thi,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.phan_tram_hoan_thanh,
  cv.hoan_thanh_luc,
  cv.gia_han_so_lan,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.khoa_thuc_hien_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten                                                   AS nguoi_tao_ten,
  ns_phu.ho_ten                                                   AS nguoi_phu_trach_ten,
  ns_giao.ho_ten                                                  AS nguoi_giao_ten,
  k.ten_khoa                                                      AS khoa_thuc_hien_ten,
  t.name                                                          AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND COALESCE(ts.code, '') NOT IN ('HOAN_THANH', 'DA_HUY')
  )                                                               AS is_qua_han,
  (
    SELECT COUNT(*)::integer
    FROM public.fact_cong_viec sub
    WHERE sub.cong_viec_cha_id = cv.id
      AND sub.is_active = true
  )                                                               AS cong_viec_con_count
FROM public.fact_cong_viec cv
LEFT JOIN public.dm_lookup_value lc
  ON lc.id = cv.loai_cong_viec_id AND lc.category_type = 'LOAI_CONG_VIEC'
LEFT JOIN public.dm_lookup_value ts
  ON ts.id = cv.trang_thai_id AND ts.category_type = 'TRANG_THAI_CONG_VIEC'
LEFT JOIN public.mdm_nhan_su ns_tao  ON cv.nguoi_tao_id        = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu  ON cv.nguoi_phu_trach_id  = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id  = ns_giao.id
LEFT JOIN public.dm_khoa_phong k     ON cv.khoa_thuc_hien_id   = k.id
LEFT JOIN public.dm_lookup_value t
  ON cv.to_cong_tac_id = t.id AND t.category_type = 'TO_CONG_TAC';

COMMENT ON VIEW public.v_fact_cong_viec_full
  IS 'View công việc đầy đủ: loại, trạng thái, người tạo/phụ trách/giao, khoa, tổ, is_qua_han, hoan_thanh_luc, gia_han_so_lan.';

-- Recreate dependent view
CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
SELECT
  id, cong_viec_cha_id, tieu_de, mo_ta,
  loai_cong_viec_id, loai_cong_viec, ten_loai_cong_viec,
  trang_thai_id, trang_thai, ten_trang_thai_hien_thi,
  muc_do_uu_tien, han_hoan_thanh, phan_tram_hoan_thanh,
  hoan_thanh_luc, gia_han_so_lan,
  nguoi_tao_id, nguoi_giao_viec_id, nguoi_phu_trach_id,
  khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
  is_active, created_at, updated_at,
  nguoi_tao_ten, nguoi_phu_trach_ten, nguoi_giao_ten,
  khoa_thuc_hien_ten, to_cong_tac_ten, is_qua_han, cong_viec_con_count
FROM public.v_fact_cong_viec_full
WHERE is_qua_han = true;

COMMENT ON VIEW public.v_cong_viec_qua_han
  IS 'Subset v_fact_cong_viec_full: chỉ phiếu đang mở và đã quá hạn (is_qua_han = true).';

-- =====================================================================
-- 7. pg_cron schedule fn_sync_overdue_tasks (00:05 VNT = 17:05 UTC)
--    Chạy hàng ngày, unschedule trước để idempotent
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule chỉ khi job đã tồn tại (tránh lỗi khi chạy lần đầu)
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'qlcv-sync-overdue-tasks'
    ) THEN
      PERFORM cron.unschedule('qlcv-sync-overdue-tasks');
    END IF;

    PERFORM cron.schedule(
      'qlcv-sync-overdue-tasks',
      '5 17 * * *',  -- 17:05 UTC = 00:05 VNT
      'SELECT public.fn_sync_overdue_tasks();'
    );
    RAISE NOTICE 'pg_cron: đã lên lịch qlcv-sync-overdue-tasks (00:05 VNT hàng ngày).';
  ELSE
    RAISE NOTICE 'pg_cron chưa được cài — bỏ qua schedule. Gọi fn_sync_overdue_tasks() thủ công hoặc qua Edge Function.';
  END IF;
END;
$$;

