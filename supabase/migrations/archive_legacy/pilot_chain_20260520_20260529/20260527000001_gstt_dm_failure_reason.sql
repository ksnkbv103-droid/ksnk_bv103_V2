-- Migration: Slice 2 (giam-sat-tuan-thu reform v4) — Bảng danh mục căn nguyên lỗi (Failure Reason).
-- Date: 27/05/2026
-- Plan: ~/.cursor/plans/giam-sat-tuan-thu_reform_ac6fc49a.plan.md (v4 — JCI 8.0).
--
-- Mục tiêu:
--   * Tạo bảng `gstt_dm_failure_reason` lưu 21 nguyên nhân lỗi tuân thủ KSNK theo
--     mô hình Ishikawa của tài liệu `docs/Giamsat/Giamsattuanthu.md` (JCI 8.0).
--   * 4 nhóm: HA_TANG_THIET_BI (FMS), HE_THONG_TO_CHUC (GLD), YEU_TO_CON_NGUOI
--     (HUM), NGUOI_BENH_LAM_SANG (PCC). 9/21 row có `yeu_cau_rca=true` → Slice 9
--     sẽ tạo trigger auto-create RCA Ticket.
--   * RLS 2 tầng:
--       - Read: cần MDM_FAILURE_REASON.view (hoặc Admin).
--       - IUD non-system rows: cần MDM_FAILURE_REASON.<create|edit|delete>.
--       - IUD system rows (is_system=true): bổ sung MDM_FAILURE_REASON.system_override
--         (chỉ Super Admin + Trưởng khoa KSNK theo plan).
--   * Audit trigger: dùng `fn_sys_audit_attach()` đã có sẵn (slice admin hardening).
--   * Seed idempotent theo `ma_loi` (UPSERT).
--   * Permission đăng ký SSOT trong `src/lib/permission-registry-data.ts` — sync chạy
--     ở [src/modules/quan-tri-he-thong/phan-quyen/actions/rbac-registry-sync.ts]
--     sẽ tự động tạo row trong `auth_dm_permissions` khi admin chạy "Đồng bộ phân quyền".

-- ----------------------------------------------------
-- 1. CREATE TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gstt_dm_failure_reason (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_loi          text NOT NULL UNIQUE,
  nhom_loi        text NOT NULL CHECK (nhom_loi IN (
                    'HA_TANG_THIET_BI',
                    'HE_THONG_TO_CHUC',
                    'YEU_TO_CON_NGUOI',
                    'NGUOI_BENH_LAM_SANG'
                  )),
  mo_ta           text NOT NULL,
  pham_vi_ap_dung text[] NOT NULL DEFAULT ARRAY['TAT_CA']::text[],
  yeu_cau_can_thiep boolean NOT NULL DEFAULT false,
  yeu_cau_rca     boolean NOT NULL DEFAULT false,
  ghi_chu         text,
  is_system       boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_by      uuid
);

COMMENT ON TABLE public.gstt_dm_failure_reason IS
  'Danh mục căn nguyên lỗi tuân thủ KSNK (Ishikawa/JCI 8.0). 21 row hệ thống + admin BV103 thêm row tùy biến (is_system=false). Slice 2 (plan v4).';
COMMENT ON COLUMN public.gstt_dm_failure_reason.ma_loi IS
  'Mã traceability JCI: 101..106 FMS, 201..205 GLD, 301..305 HUM, 401..405 PCC.';
COMMENT ON COLUMN public.gstt_dm_failure_reason.nhom_loi IS
  '4 nhóm Ishikawa: HA_TANG_THIET_BI=FMS, HE_THONG_TO_CHUC=GLD, YEU_TO_CON_NGUOI=HUM, NGUOI_BENH_LAM_SANG=PCC.';
COMMENT ON COLUMN public.gstt_dm_failure_reason.pham_vi_ap_dung IS
  'Tag context để FailureReasonDropdown lọc thông minh. Mảng text linh hoạt — KHÔNG CHECK cứng để admin BV103 thêm tag tùy biến (ví dụ LOC_MAU, NHA_KHOA) qua MDM mà không cần migration.';
COMMENT ON COLUMN public.gstt_dm_failure_reason.yeu_cau_rca IS
  'Cờ kích hoạt trigger auto-create gstt_fact_rca_ticket (Slice 9). 9/21 row có giá trị TRUE.';

-- ----------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gstt_fr_nhom
  ON public.gstt_dm_failure_reason (nhom_loi)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_gstt_fr_rca
  ON public.gstt_dm_failure_reason (id)
  WHERE yeu_cau_rca = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_gstt_fr_pham_vi_gin
  ON public.gstt_dm_failure_reason
  USING GIN (pham_vi_ap_dung);

CREATE INDEX IF NOT EXISTS idx_gstt_fr_active
  ON public.gstt_dm_failure_reason (is_active, ma_loi)
  WHERE is_active = true;

-- ----------------------------------------------------
-- 3. AUDIT TRIGGER
-- ----------------------------------------------------
DO $$
BEGIN
  PERFORM public.fn_sys_audit_attach('public.gstt_dm_failure_reason'::regclass);
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE '[gstt_dm_failure_reason] fn_sys_audit_attach chưa tồn tại — bỏ qua audit trigger (apply migration audit hardening trước).';
  WHEN OTHERS THEN
    RAISE NOTICE '[gstt_dm_failure_reason] Lỗi attach audit: %', SQLERRM;
END $$;

-- ----------------------------------------------------
-- 4. RLS — 2 tầng (regular vs system_override)
-- ----------------------------------------------------
ALTER TABLE public.gstt_dm_failure_reason ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gstt_dm_failure_reason FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gstt_dm_failure_reason_select ON public.gstt_dm_failure_reason;
CREATE POLICY gstt_dm_failure_reason_select
  ON public.gstt_dm_failure_reason
  FOR SELECT
  TO authenticated
  USING (public.fn_sys_has_permission('MDM_FAILURE_REASON', 'view'));

DROP POLICY IF EXISTS gstt_dm_failure_reason_insert ON public.gstt_dm_failure_reason;
CREATE POLICY gstt_dm_failure_reason_insert
  ON public.gstt_dm_failure_reason
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.fn_sys_has_permission('MDM_FAILURE_REASON', 'create')
    AND (
      is_system = false
      OR public.fn_sys_has_permission('MDM_FAILURE_REASON', 'system_override')
    )
  );

DROP POLICY IF EXISTS gstt_dm_failure_reason_update ON public.gstt_dm_failure_reason;
CREATE POLICY gstt_dm_failure_reason_update
  ON public.gstt_dm_failure_reason
  FOR UPDATE
  TO authenticated
  USING (
    public.fn_sys_has_permission('MDM_FAILURE_REASON', 'edit')
    AND (
      is_system = false
      OR public.fn_sys_has_permission('MDM_FAILURE_REASON', 'system_override')
    )
  )
  WITH CHECK (
    public.fn_sys_has_permission('MDM_FAILURE_REASON', 'edit')
    AND (
      is_system = false
      OR public.fn_sys_has_permission('MDM_FAILURE_REASON', 'system_override')
    )
  );

DROP POLICY IF EXISTS gstt_dm_failure_reason_delete ON public.gstt_dm_failure_reason;
CREATE POLICY gstt_dm_failure_reason_delete
  ON public.gstt_dm_failure_reason
  FOR DELETE
  TO authenticated
  USING (
    public.fn_sys_has_permission('MDM_FAILURE_REASON', 'delete')
    AND (
      is_system = false
      OR public.fn_sys_has_permission('MDM_FAILURE_REASON', 'system_override')
    )
  );

-- ----------------------------------------------------
-- 5. SEED 21 REASONS — JCI 8.0 / Ishikawa
--    Idempotent theo ma_loi (UPSERT). is_system=true cho cả 21.
-- ----------------------------------------------------
INSERT INTO public.gstt_dm_failure_reason
  (ma_loi, nhom_loi, mo_ta, pham_vi_ap_dung, yeu_cau_can_thiep, yeu_cau_rca, is_system, is_active)
VALUES
  -- Nhóm HA_TANG_THIET_BI (FMS, 6 row)
  ('101', 'HA_TANG_THIET_BI', 'Thiếu vật tư VST/PPE tại nơi làm việc',
    ARRAY['TAT_CA', 'VST', 'PPE'], true,  false, true, true),
  ('102', 'HA_TANG_THIET_BI', 'Thiết kế bồn rửa tay/thùng đựng rác sai vị trí, khó tiếp cận',
    ARRAY['TAT_CA', 'VST', 'CHATTHAI'], false, false, true, true),
  ('103', 'HA_TANG_THIET_BI', 'Sự cố HVAC: phòng áp lực âm/dương không đạt chuẩn',
    ARRAY['MOI_TRUONG', 'MOI_TRUONG_OR'], true, true, true, true),
  ('104', 'HA_TANG_THIET_BI', 'Nước RO/khí y tế không đạt chuẩn vi sinh - lý hóa',
    ARRAY['XU_LY_DC', 'CHAY_THAN'], true, true, true, true),
  ('105', 'HA_TANG_THIET_BI', 'Hỏng máy tiệt khuẩn/máy nội soi/máy rửa dụng cụ',
    ARRAY['XU_LY_DC'], true, true, true, true),
  ('106', 'HA_TANG_THIET_BI', 'Hàng hết hạn sử dụng/hỏng bao bì/nghi ngờ hàng giả',
    ARRAY['TAT_CA', 'KHO', 'XU_LY_DC'], true, true, true, true),

  -- Nhóm HE_THONG_TO_CHUC (GLD, 5 row)
  ('201', 'HE_THONG_TO_CHUC', 'Chưa có SOP/quy trình cho tình huống thực tế',
    ARRAY['TAT_CA'], false, true, true, true),
  ('202', 'HE_THONG_TO_CHUC', 'Nhân viên chưa được đào tạo về quy trình KSNK liên quan',
    ARRAY['TAT_CA'], true, true, true, true),
  ('203', 'HE_THONG_TO_CHUC', 'Quá tải công việc / tỷ lệ điều dưỡng:người bệnh không an toàn',
    ARRAY['TAT_CA'], false, true, true, true),
  ('204', 'HE_THONG_TO_CHUC', 'Lỗi giao tiếp / bàn giao ca thiếu thông tin (MDROs, cách ly)',
    ARRAY['TAT_CA', 'BANG_GIAO_CA'], true, true, true, true),
  ('205', 'HE_THONG_TO_CHUC', 'Thiếu y lệnh / y lệnh bác sĩ không rõ ràng',
    ARRAY['TAT_CA'], true, false, true, true),

  -- Nhóm YEU_TO_CON_NGUOI (HUM, 5 row)
  ('301', 'YEU_TO_CON_NGUOI', 'Lỗi do mệt mỏi / alarm fatigue / burnout của NVYT',
    ARRAY['TAT_CA'], true, false, true, true),
  ('302', 'YEU_TO_CON_NGUOI', 'Sai kỹ thuật do chưa thạo (skill-based error - người mới)',
    ARRAY['TAT_CA'], true, false, true, true),
  ('303', 'YEU_TO_CON_NGUOI', 'Thói quen đi tắt quy trình / Routine violation (cố ý nhẹ)',
    ARRAY['TAT_CA', 'VST'], true, true, true, true),
  ('304', 'YEU_TO_CON_NGUOI', 'Cố ý vi phạm / Reckless behavior (gây nguy hiểm rõ ràng)',
    ARRAY['TAT_CA'], true, true, true, true),
  ('305', 'YEU_TO_CON_NGUOI', 'Nhận thức sai (vd đeo găng tay thay cho VST đầy đủ)',
    ARRAY['TAT_CA', 'VST', 'PPE'], true, false, true, true),

  -- Nhóm NGUOI_BENH_LAM_SANG (PCC, 5 row)
  ('401', 'NGUOI_BENH_LAM_SANG', 'Tình huống cấp cứu khẩn cấp đe dọa tính mạng (Code Blue)',
    ARRAY['TAT_CA'], false, false, true, true),
  ('402', 'NGUOI_BENH_LAM_SANG', 'Người bệnh kích thích / mê sảng / không hợp tác',
    ARRAY['TAT_CA'], false, false, true, true),
  ('403', 'NGUOI_BENH_LAM_SANG', 'Rào cản ngôn ngữ / người bệnh từ chối tuân thủ',
    ARRAY['TAT_CA'], false, false, true, true),
  ('404', 'NGUOI_BENH_LAM_SANG', 'Bệnh lý / giải phẫu đặc thù gây khó tuân thủ chuẩn',
    ARRAY['TAT_CA'], false, false, true, true),
  ('405', 'NGUOI_BENH_LAM_SANG', 'Bệnh da liễu / dị ứng của NVYT khiến VST đầy đủ khó khăn',
    ARRAY['VST', 'PPE'], false, false, true, true)
ON CONFLICT (ma_loi) DO UPDATE SET
  nhom_loi          = EXCLUDED.nhom_loi,
  mo_ta             = EXCLUDED.mo_ta,
  pham_vi_ap_dung   = EXCLUDED.pham_vi_ap_dung,
  yeu_cau_can_thiep = EXCLUDED.yeu_cau_can_thiep,
  yeu_cau_rca       = EXCLUDED.yeu_cau_rca,
  is_system         = EXCLUDED.is_system,
  is_active         = EXCLUDED.is_active,
  updated_at        = now();

-- ----------------------------------------------------
-- 6. Trigger keep updated_at
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_gstt_failure_reason_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gstt_fr_touch_updated_at ON public.gstt_dm_failure_reason;
CREATE TRIGGER trg_gstt_fr_touch_updated_at
  BEFORE UPDATE ON public.gstt_dm_failure_reason
  FOR EACH ROW EXECUTE FUNCTION public.fn_gstt_failure_reason_touch_updated_at();

-- ----------------------------------------------------
-- 7. Sanity check (NOTICE only)
-- ----------------------------------------------------
DO $$
DECLARE
  v_count int;
  v_rca   int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.gstt_dm_failure_reason WHERE is_system = true;
  SELECT COUNT(*) INTO v_rca   FROM public.gstt_dm_failure_reason WHERE yeu_cau_rca = true AND is_system = true;
  RAISE NOTICE '[gstt_dm_failure_reason] seeded % system rows; % require RCA.', v_count, v_rca;
END $$;
