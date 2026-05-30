-- Migration: Slice 9 (giam-sat-tuan-thu reform v4 / JCI 8.0 QPS Chương 11)
-- RCA Ticket workflow — auto-trigger sau phiên có reason `yeu_cau_rca=true`.
-- Date: 27/05/2026
-- Plan: ~/.cursor/plans/giam-sat-tuan-thu_reform_ac6fc49a.plan.md
--
-- Mục tiêu:
--   * CREATE TABLE `gstt_fact_rca_ticket` lưu phiếu phân tích nguyên nhân gốc rễ
--     (Root Cause Analysis) với deadline 45 ngày theo JCI Quality Improvement.
--   * Auto-routing `phong_ban_xu_ly` theo `nhom_loi` của reason gốc:
--       - HA_TANG_THIET_BI       → PHONG_VTYT
--       - HE_THONG_TO_CHUC 202   → PHONG_DAO_TAO
--       - HE_THONG_TO_CHUC 203/5 → PHONG_DD
--       - HE_THONG_TO_CHUC khác  → PHONG_QLCL
--       - YEU_TO_CON_NGUOI       → KHOA_KSNK
--       - NGUOI_BENH_LAM_SANG    → KHOA_KSNK
--   * 2 trigger SECURITY DEFINER (chạy bằng quyền owner để bypass RLS INSERT):
--       - fn_gstt_rca_create_from_chung_session: scan results_jsonb của phiên GSC.
--       - fn_gstt_rca_create_from_vst_obs: theo `nguyen_nhan_loi_id` của VST opportunity.
--   * Idempotent: UNIQUE (nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id).
--   * VIEW `v_gstt_rca_ticket_with_overdue` derive `is_overdue` realtime — KHÔNG persist
--     `QUA_HAN` qua cron (chốt v4).
--   * RLS:
--       - Chỉ ENABLE (không FORCE) → table owner bypass RLS để trigger insert.
--       - SELECT/UPDATE policy theo permission `RCA_TICKET`.
--       - Authenticated KHÔNG có policy INSERT/DELETE → cấm.

-- ----------------------------------------------------
-- 1. CREATE TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gstt_fact_rca_ticket (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_ticket             text NOT NULL UNIQUE,
  nguon_phat_sinh       text NOT NULL CHECK (nguon_phat_sinh IN ('GIAM_SAT_CHUNG', 'GIAM_SAT_VST')),
  phien_giam_sat_id     uuid,
  nguyen_nhan_loi_id    uuid NOT NULL REFERENCES public.gstt_dm_failure_reason(id) ON DELETE RESTRICT,
  mo_ta_su_co           text NOT NULL,
  khu_vuc_xay_ra_id     uuid,
  nguoi_bao_cao_id      uuid NOT NULL,
  nguoi_xu_ly_id        uuid,
  phong_ban_xu_ly       text NOT NULL CHECK (phong_ban_xu_ly IN (
                          'PHONG_QLCL', 'PHONG_VTYT', 'PHONG_DAO_TAO', 'PHONG_DD', 'KHOA_KSNK'
                        )),
  trang_thai            text NOT NULL DEFAULT 'MOI' CHECK (trang_thai IN (
                          'MOI', 'DANG_PHAN_TICH', 'HOAN_THANH', 'QUA_HAN', 'HUY'
                        )),
  han_xu_ly             date NOT NULL,
  ngay_hoan_thanh       date,
  phan_tich_5_whys      text,
  bien_phap_khac_phuc   text,
  bien_phap_phong_ngua  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gstt_fact_rca_ticket IS
  'Slice 9 (reform v4): Phiếu RCA tự động tạo sau phiên giám sát có reason yeu_cau_rca=true. Deadline 45 ngày JCI QPS Chương 11.';
COMMENT ON COLUMN public.gstt_fact_rca_ticket.phien_giam_sat_id IS
  'Polymorphic FK (KHÔNG enforce DB level): trỏ tới gstt_fact_chung_sessions(id) khi nguon=GIAM_SAT_CHUNG, hoặc gstt_fact_vst_sessions(id) khi nguon=GIAM_SAT_VST.';
COMMENT ON COLUMN public.gstt_fact_rca_ticket.han_xu_ly IS
  'Auto = created_at + 45 ngày. Quá hạn derive realtime qua VIEW v_gstt_rca_ticket_with_overdue, KHÔNG cron.';
COMMENT ON COLUMN public.gstt_fact_rca_ticket.trang_thai IS
  'QUA_HAN chỉ set thủ công khi user đóng ticket muộn — KHÔNG auto-set qua cron (v4 trade-off).';

-- Composite UNIQUE: idempotent — submit lại cùng phiên không tạo duplicate ticket.
ALTER TABLE public.gstt_fact_rca_ticket
  DROP CONSTRAINT IF EXISTS uq_gstt_rca_nguon_phien_reason;
ALTER TABLE public.gstt_fact_rca_ticket
  ADD CONSTRAINT uq_gstt_rca_nguon_phien_reason
  UNIQUE (nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id);

-- ----------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gstt_rca_trang_thai_han
  ON public.gstt_fact_rca_ticket (trang_thai, han_xu_ly)
  WHERE trang_thai IN ('MOI', 'DANG_PHAN_TICH');

CREATE INDEX IF NOT EXISTS idx_gstt_rca_phong_ban
  ON public.gstt_fact_rca_ticket (phong_ban_xu_ly, trang_thai);

CREATE INDEX IF NOT EXISTS idx_gstt_rca_nguon_phien
  ON public.gstt_fact_rca_ticket (nguon_phat_sinh, phien_giam_sat_id);

CREATE INDEX IF NOT EXISTS idx_gstt_rca_nguoi_xu_ly
  ON public.gstt_fact_rca_ticket (nguoi_xu_ly_id, trang_thai)
  WHERE nguoi_xu_ly_id IS NOT NULL;

-- ----------------------------------------------------
-- 3. AUDIT TRIGGER + touch updated_at
-- ----------------------------------------------------
DO $$
BEGIN
  PERFORM public.fn_sys_audit_attach('public.gstt_fact_rca_ticket'::regclass);
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE '[gstt_fact_rca_ticket] fn_sys_audit_attach chưa tồn tại — bỏ qua audit trigger.';
  WHEN OTHERS THEN
    RAISE NOTICE '[gstt_fact_rca_ticket] Lỗi attach audit: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.fn_gstt_rca_ticket_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gstt_rca_touch_updated_at ON public.gstt_fact_rca_ticket;
CREATE TRIGGER trg_gstt_rca_touch_updated_at
  BEFORE UPDATE ON public.gstt_fact_rca_ticket
  FOR EACH ROW EXECUTE FUNCTION public.fn_gstt_rca_ticket_touch_updated_at();

-- ----------------------------------------------------
-- 4. RLS — ENABLE (không FORCE) để trigger SECURITY DEFINER bypass được.
-- ----------------------------------------------------
ALTER TABLE public.gstt_fact_rca_ticket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gstt_fact_rca_ticket_select ON public.gstt_fact_rca_ticket;
CREATE POLICY gstt_fact_rca_ticket_select
  ON public.gstt_fact_rca_ticket
  FOR SELECT
  TO authenticated
  USING (public.fn_sys_has_permission('RCA_TICKET', 'view'));

-- INSERT KHÔNG có policy → authenticated bị chặn. Trigger SECURITY DEFINER (chạy bằng
-- quyền owner / postgres) bypass RLS vì không có FORCE ROW LEVEL SECURITY.
DROP POLICY IF EXISTS gstt_fact_rca_ticket_insert_blocked ON public.gstt_fact_rca_ticket;

DROP POLICY IF EXISTS gstt_fact_rca_ticket_update_assign ON public.gstt_fact_rca_ticket;
CREATE POLICY gstt_fact_rca_ticket_update_assign
  ON public.gstt_fact_rca_ticket
  FOR UPDATE
  TO authenticated
  USING (
    public.fn_sys_has_permission('RCA_TICKET', 'assign')
    OR public.fn_sys_has_permission('RCA_TICKET', 'close')
  )
  WITH CHECK (
    public.fn_sys_has_permission('RCA_TICKET', 'assign')
    OR public.fn_sys_has_permission('RCA_TICKET', 'close')
  );

-- DELETE KHÔNG có policy → cấm. Status `HUY` thay cho hard delete để giữ vết audit.

-- ----------------------------------------------------
-- 5. Helper functions
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gstt_rca_route_phong_ban(
  p_nhom_loi text,
  p_ma_loi   text
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_nhom_loi = 'HA_TANG_THIET_BI' THEN 'PHONG_VTYT'
    WHEN p_nhom_loi = 'HE_THONG_TO_CHUC' AND p_ma_loi = '202' THEN 'PHONG_DAO_TAO'
    WHEN p_nhom_loi = 'HE_THONG_TO_CHUC' AND p_ma_loi IN ('203', '205') THEN 'PHONG_DD'
    WHEN p_nhom_loi = 'HE_THONG_TO_CHUC' THEN 'PHONG_QLCL'
    WHEN p_nhom_loi = 'YEU_TO_CON_NGUOI' THEN 'KHOA_KSNK'
    ELSE 'KHOA_KSNK'
  END;
$$;

COMMENT ON FUNCTION public.fn_gstt_rca_route_phong_ban(text, text) IS
  'Slice 9: routing phòng ban xử lý RCA theo nhóm Ishikawa. Khớp với rca-ticket.domain.ts để app/DB không lệch.';

-- Sinh mã ticket dạng RCA-YYYYMMDD-NNNN. Sequence là số ticket hiện có trong ngày + 1.
CREATE OR REPLACE FUNCTION public.fn_gstt_rca_gen_ma_ticket(p_created timestamptz)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_date_part text;
  v_count     int;
BEGIN
  v_date_part := to_char(p_created AT TIME ZONE 'UTC', 'YYYYMMDD');
  SELECT count(*) INTO v_count
    FROM public.gstt_fact_rca_ticket
   WHERE (created_at AT TIME ZONE 'UTC')::date = (p_created AT TIME ZONE 'UTC')::date;
  RETURN format('RCA-%s-%s', v_date_part, lpad((v_count + 1)::text, 4, '0'));
END;
$$;

COMMENT ON FUNCTION public.fn_gstt_rca_gen_ma_ticket(timestamptz) IS
  'Slice 9: sinh mã ticket RCA-YYYYMMDD-NNNN. SECURITY DEFINER để đếm bypass RLS khi trigger gọi.';

-- ----------------------------------------------------
-- 6. Trigger function — tạo ticket từ phiên Giám sát chung (results_jsonb)
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gstt_rca_create_from_chung_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result    jsonb;
  v_reason    public.gstt_dm_failure_reason%ROWTYPE;
  v_phong_ban text;
  v_ma_ticket text;
  v_mo_ta     text;
  v_now       timestamptz := now();
  v_han       date := (v_now AT TIME ZONE 'UTC')::date + INTERVAL '45 days';
BEGIN
  IF NEW.results_jsonb IS NULL OR jsonb_typeof(NEW.results_jsonb) <> 'array' THEN
    RETURN NEW;
  END IF;

  -- Phiên không có người giám sát → bỏ qua (sẽ vi phạm NOT NULL nguoi_bao_cao_id).
  IF NEW.nguoi_giam_sat_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_result IN SELECT * FROM jsonb_array_elements(NEW.results_jsonb)
  LOOP
    -- Chỉ tạo ticket cho item có reason và value KHONG_DAT (defensive).
    IF (v_result->>'nguyen_nhan_loi_id') IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_reason
      FROM public.gstt_dm_failure_reason
     WHERE id = (v_result->>'nguyen_nhan_loi_id')::uuid
       AND is_active = true;

    IF NOT FOUND OR NOT v_reason.yeu_cau_rca THEN
      CONTINUE;
    END IF;

    v_phong_ban := public.fn_gstt_rca_route_phong_ban(v_reason.nhom_loi, v_reason.ma_loi);
    v_ma_ticket := public.fn_gstt_rca_gen_ma_ticket(v_now);
    v_mo_ta := format(
      'Phiên giám sát %s ngày %s — Tiêu chí %s: %s',
      COALESCE(NEW.id::text, '?'),
      COALESCE(NEW.ngay_giam_sat::text, '?'),
      COALESCE(v_result->>'criterion_id', '?'),
      v_reason.mo_ta
    );

    INSERT INTO public.gstt_fact_rca_ticket (
      ma_ticket, nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id,
      mo_ta_su_co, khu_vuc_xay_ra_id, nguoi_bao_cao_id,
      phong_ban_xu_ly, trang_thai, han_xu_ly, created_at, updated_at
    ) VALUES (
      v_ma_ticket, 'GIAM_SAT_CHUNG', NEW.id, v_reason.id,
      v_mo_ta, NEW.khoa_id, NEW.nguoi_giam_sat_id,
      v_phong_ban, 'MOI', v_han, v_now, v_now
    )
    ON CONFLICT (nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_gstt_rca_create_from_chung_session() IS
  'Slice 9: scan results_jsonb sau INSERT/UPDATE phiên giám sát chung; tạo ticket RCA cho mỗi reason yeu_cau_rca=true. Idempotent qua composite UNIQUE.';

DROP TRIGGER IF EXISTS trg_gstt_rca_from_chung_session ON public.gstt_fact_chung_sessions;
CREATE TRIGGER trg_gstt_rca_from_chung_session
  AFTER INSERT OR UPDATE OF results_jsonb ON public.gstt_fact_chung_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_gstt_rca_create_from_chung_session();

-- ----------------------------------------------------
-- 7. Trigger function — tạo ticket từ cơ hội VST không tuân thủ
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gstt_rca_create_from_vst_obs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reason       public.gstt_dm_failure_reason%ROWTYPE;
  v_phong_ban    text;
  v_ma_ticket    text;
  v_mo_ta        text;
  v_session      record;
  v_nguoi_bao_cao uuid;
  v_now          timestamptz := now();
  v_han          date := (v_now AT TIME ZONE 'UTC')::date + INTERVAL '45 days';
BEGIN
  IF NEW.nguyen_nhan_loi_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_reason
    FROM public.gstt_dm_failure_reason
   WHERE id = NEW.nguyen_nhan_loi_id
     AND is_active = true;

  IF NOT FOUND OR NOT v_reason.yeu_cau_rca THEN
    RETURN NEW;
  END IF;

  -- Lấy session để kế thừa nguoi_giam_sat làm người báo cáo + xác định khu vực.
  SELECT s.id, s.nguoi_giam_sat_id, s.khoa_id
    INTO v_session
    FROM public.gstt_fact_vst_sessions s
   WHERE s.id = NEW.session_id;

  v_nguoi_bao_cao := COALESCE(v_session.nguoi_giam_sat_id, NEW.nhan_vien_id);
  IF v_nguoi_bao_cao IS NULL THEN
    RETURN NEW;
  END IF;

  v_phong_ban := public.fn_gstt_rca_route_phong_ban(v_reason.nhom_loi, v_reason.ma_loi);
  v_ma_ticket := public.fn_gstt_rca_gen_ma_ticket(v_now);
  v_mo_ta := format(
    'Cơ hội VST %s ngày %s — %s (%s)',
    COALESCE(NEW.id::text, '?'),
    COALESCE(NEW.ngay_giam_sat::text, '?'),
    COALESCE(NEW.hanh_dong, '?'),
    v_reason.mo_ta
  );

  INSERT INTO public.gstt_fact_rca_ticket (
    ma_ticket, nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id,
    mo_ta_su_co, khu_vuc_xay_ra_id, nguoi_bao_cao_id,
    phong_ban_xu_ly, trang_thai, han_xu_ly, created_at, updated_at
  ) VALUES (
    v_ma_ticket, 'GIAM_SAT_VST', NEW.session_id, v_reason.id,
    v_mo_ta, COALESCE(NEW.khu_vuc_id, v_session.khoa_id), v_nguoi_bao_cao,
    v_phong_ban, 'MOI', v_han, v_now, v_now
  )
  ON CONFLICT (nguon_phat_sinh, phien_giam_sat_id, nguyen_nhan_loi_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_gstt_rca_create_from_vst_obs() IS
  'Slice 9: tạo ticket RCA cho cơ hội VST có nguyen_nhan_loi_id thuộc reason yeu_cau_rca=true. Idempotent.';

DROP TRIGGER IF EXISTS trg_gstt_rca_from_vst_obs ON public.gstt_fact_vst;
CREATE TRIGGER trg_gstt_rca_from_vst_obs
  AFTER INSERT OR UPDATE OF nguyen_nhan_loi_id ON public.gstt_fact_vst
  FOR EACH ROW EXECUTE FUNCTION public.fn_gstt_rca_create_from_vst_obs();

-- ----------------------------------------------------
-- 8. VIEW derive overdue realtime (v4 — KHÔNG cron)
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_rca_ticket_with_overdue CASCADE;
CREATE VIEW public.v_gstt_rca_ticket_with_overdue
WITH (security_invoker = true) AS
SELECT
  t.*,
  CASE
    WHEN t.trang_thai IN ('MOI', 'DANG_PHAN_TICH') AND t.han_xu_ly < CURRENT_DATE
    THEN true ELSE false
  END AS is_overdue,
  GREATEST(0, CURRENT_DATE - t.han_xu_ly)::int AS so_ngay_qua_han
FROM public.gstt_fact_rca_ticket t;

COMMENT ON VIEW public.v_gstt_rca_ticket_with_overdue IS
  'Slice 9 (reform v4): derive is_overdue + so_ngay_qua_han realtime. Khớp logic isOverdue() ở rca-ticket.domain.ts. KHÔNG cần cron.';

-- ----------------------------------------------------
-- 9. Sanity check
-- ----------------------------------------------------
DO $$
DECLARE
  v_trigger_chung int;
  v_trigger_vst   int;
BEGIN
  SELECT count(*) INTO v_trigger_chung
    FROM pg_trigger
   WHERE tgname = 'trg_gstt_rca_from_chung_session';
  SELECT count(*) INTO v_trigger_vst
    FROM pg_trigger
   WHERE tgname = 'trg_gstt_rca_from_vst_obs';
  RAISE NOTICE '[gstt_fact_rca_ticket] triggers: chung=% vst=%', v_trigger_chung, v_trigger_vst;
END $$;
