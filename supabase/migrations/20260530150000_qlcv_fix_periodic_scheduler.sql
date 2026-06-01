-- =============================================================================
-- Migration: 20260530150000_qlcv_fix_periodic_scheduler.sql
-- Mục tiêu:
--   1. Nới lỏng CHECK CONSTRAINT trên qlcv_fact_cong_viec_dinh_ky
--      → Cho phép cả 4 chu kỳ: DAILY | WEEKLY | MONTHLY | QUARTERLY
--   2. Sửa lỗi logic hàm fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
--      Mirror 100% với bộ lập lịch TypeScript phía client.
--   3. Thêm cột muc_do_uu_tien & khoa_thuc_hien_id vào qlcv_fact_cong_viec_dinh_ky
--      (đã có trên fact_cong_viec nhưng thiếu trên bảng mẫu định kỳ)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Nới lỏng CHECK CONSTRAINT trên qlcv_fact_cong_viec_dinh_ky
-- -----------------------------------------------------------------------------
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  DROP CONSTRAINT IF EXISTS "fact_cong_viec_dinh_ky_ma_chu_ky_check";

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD CONSTRAINT "fact_cong_viec_dinh_ky_ma_chu_ky_check"
  CHECK (ma_chu_ky = ANY (ARRAY['DAILY'::text, 'WEEKLY'::text, 'MONTHLY'::text, 'QUARTERLY'::text]));

-- -----------------------------------------------------------------------------
-- STEP 2: Thêm các cột bị thiếu trên bảng mẫu định kỳ
--   (Cần thiết để INSERT vào fact_cong_viec khớp đầy đủ trường)
-- -----------------------------------------------------------------------------
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS muc_do_uu_tien text DEFAULT 'TRUNG_BINH'
    CHECK (muc_do_uu_tien = ANY (ARRAY['THAP'::text, 'TRUNG_BINH'::text, 'CAO'::text, 'KHAN_CAP'::text])),
  ADD COLUMN IF NOT EXISTS khoa_thuc_hien_id uuid REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- STEP 3: Sửa hàm fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
--   Logic mirror TypeScript dinhKyMatchDueOnDate():
--   - DAILY    : anchor <= due (mỗi ngày từ mốc)
--   - WEEKLY   : (due - anchor) % 7 = 0
--   - MONTHLY  : extract(day from due) = extract(day from anchor)
--   - QUARTERLY: cùng ngày trong tháng VÀ (months_diff % 3 = 0)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted int := 0;
  r        record;
  due      date := CURRENT_DATE;
  match_due boolean;
  v_loai_id   uuid;
  v_tt_moi_id uuid;
  anchor_months int;
  due_months    int;
BEGIN
  -- Lấy loại công việc DINH_KY
  SELECT id INTO v_loai_id
    FROM public.dm_loai_cong_viec
   WHERE ma = 'DINH_KY'
   LIMIT 1;

  -- Lấy trạng thái ban đầu MOI (Mới / Chờ nhận việc)
  SELECT id INTO v_tt_moi_id
    FROM public.dm_trang_thai_cong_viec
   WHERE ma = 'MOI'
   LIMIT 1;

  -- Duyệt toàn bộ mẫu định kỳ đang hoạt động
  FOR r IN
    SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true
  LOOP
    -- Bỏ qua nếu ngày mốc chưa đến
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;

    match_due := false;

    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN
        -- Khớp mọi ngày từ ngày mốc trở đi
        match_due := true;

      WHEN 'WEEKLY' THEN
        -- Khớp khi khoảng cách ngày chia hết cho 7
        match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;

      WHEN 'MONTHLY' THEN
        -- Khớp khi cùng ngày trong tháng với mốc
        match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);

      WHEN 'QUARTERLY' THEN
        -- Khớp khi cùng ngày trong tháng VÀ số tháng chênh lệch chia hết cho 3
        IF extract(day from due::timestamp) <> extract(day from r.ngay_bat_dau::timestamp) THEN
          CONTINUE;
        END IF;
        anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau)::int;
        due_months    := date_part('year', due)::int * 12 + date_part('month', due)::int;
        match_due := mod(due_months - anchor_months, 3) = 0;

      ELSE
        CONTINUE; -- Chu kỳ không rõ → bỏ qua an toàn
    END CASE;

    IF NOT match_due THEN CONTINUE; END IF;

    -- Kiểm tra idempotency: đã có phiếu (mẫu × hạn) này chưa?
    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
       WHERE c.dinh_ky_mau_id = r.id
         AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    -- Sinh phiếu công việc từ mẫu
    INSERT INTO public.fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id,
      muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id,
      dinh_ky_mau_id, nguoi_tao_id, nguoi_giao_viec_id,
      phan_tram_hoan_thanh, is_active
    ) VALUES (
      r.tieu_de,
      r.mo_ta,
      v_loai_id,
      v_tt_moi_id,
      coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'),
      due,
      r.nguoi_phu_trach_id,
      r.khoa_thuc_hien_id,
      r.to_cong_tac_id,
      r.id,
      r.nguoi_tao_id,
      r.nguoi_tao_id,
      0,
      true
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

COMMENT ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'Sinh fact_cong_viec từ mẫu định kỳ active; idempotent theo (dinh_ky_mau_id, han_hoan_thanh).
   Hỗ trợ đủ 4 chu kỳ: DAILY / WEEKLY / MONTHLY / QUARTERLY.
   Gọi hàng ngày bởi pg_cron hoặc Edge Function. Migration: 20260530150000.';

-- -----------------------------------------------------------------------------
-- STEP 4: Cập nhật cron schedule (nếu pg_cron đã có job cũ)
--   job_name phải khớp với migration 20260530082000_qlcv_cron_schedule.sql
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Xóa job cũ nếu tồn tại (cả dạng gạch nối lẫn gạch dưới), tạo lại để áp dụng logic mới
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv_spawn_dinh_ky_daily') THEN
      PERFORM cron.unschedule('qlcv_spawn_dinh_ky_daily');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv-spawn-dinh-ky-daily') THEN
      PERFORM cron.unschedule('qlcv-spawn-dinh-ky-daily');
    END IF;

    PERFORM cron.schedule(
      'qlcv-spawn-dinh-ky-daily',
      '0 1 * * *',   -- 01:00 UTC mỗi ngày (08:00 ICT)
      'SELECT public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay();'
    );
  END IF;
END;
$$;
