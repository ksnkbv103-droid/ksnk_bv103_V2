-- Migration: Slice 1 (giam-sat-tuan-thu reform v4) — 5 cột metadata Việt hóa cho gstt_dm_bang_kiem.
-- Date: 27/05/2026
-- Plan: ~/.cursor/plans/giam-sat-tuan-thu_reform_ac6fc49a.plan.md
--
-- Mục tiêu:
--   * ALTER additive `gstt_dm_bang_kiem` thêm 5 cột Việt hóa để phân loại bảng kiểm
--     theo cách JCI 8.0 (taxonomy) — tài liệu `docs/Giamsat/Giamsattuanthu.md`.
--   * NULL-able + CHECK constraint => phiên cũ vẫn load (Slice 1 chỉ chuẩn bị schema).
--   * Slice 5 sẽ render UI theo `loai_giam_sat`/`doi_tuong_giam_sat`/`cach_tinh_diem`.
--   * Slice 6 sẽ seed 3 templates pilot điền đủ 5 cột này.
--   * Backward compat: migration KHÔNG chạm tieu_chi_jsonb / view `gstt_dm_tieu_chi_bang_kiem`.

-- ----------------------------------------------------
-- 1. ALTER TABLE — additive 5 cột
-- ----------------------------------------------------
ALTER TABLE public.gstt_dm_bang_kiem
  ADD COLUMN IF NOT EXISTS phan_loai_chuyen_mon text,
  ADD COLUMN IF NOT EXISTS loai_giam_sat        text,
  ADD COLUMN IF NOT EXISTS doi_tuong_giam_sat   text,
  ADD COLUMN IF NOT EXISTS cach_tinh_diem       text,
  ADD COLUMN IF NOT EXISTS phien_ban            text DEFAULT '1.0';

COMMENT ON COLUMN public.gstt_dm_bang_kiem.phan_loai_chuyen_mon IS
  'Phân loại chuyên môn KSNK (Category): PHONG_NGUA_CHUAN | GOI_CAN_THIEP | XU_LY_DUNG_CU | MOI_TRUONG_CHAT_THAI | CHUYEN_KHOA. Ánh xạ Dim_Checklist_Template.Category trong tài liệu.';
COMMENT ON COLUMN public.gstt_dm_bang_kiem.loai_giam_sat IS
  'Loại hoạt động giám sát (Super_Category): TUAN_THU=mạng lưới audit hành vi NVYT; NHAT_KY_VAN_HANH=NVYT khoa tự log số liệu (nhiệt độ lò TK, áp suất AIIR, MEC, RO); DANH_GIA_HE_THONG=thanh tra JCI/APSIC dùng nội bộ.';
COMMENT ON COLUMN public.gstt_dm_bang_kiem.doi_tuong_giam_sat IS
  'Đối tượng được quan sát (Target_Type): NHAN_VIEN | NGUOI_BENH | MOI_TRUONG | THIET_BI | ME_TIET_KHUAN. Quyết định form fields ở Slice 5 (NHAN_VIEN bắt nghề nghiệp, NGUOI_BENH bắt mã NB...).';
COMMENT ON COLUMN public.gstt_dm_bang_kiem.cach_tinh_diem IS
  'Thuật toán scoring (Scoring_Logic): TY_LE=PERCENTAGE %; TRON_GOI=ALL_OR_NONE care bundle; DAT_KHONG_DAT=PASS_FAIL ngưỡng cứng; NHAT_KY=LOG_ENTRY chỉ ghi không tính rate. Slice 4 implement engine.';
COMMENT ON COLUMN public.gstt_dm_bang_kiem.phien_ban IS
  'Phiên bản bảng kiểm (Dim_Checklist_Template.Version) — text linh hoạt (1.0, 2.1...). Cho audit thay đổi nội dung tiêu chí.';

-- ----------------------------------------------------
-- 2. CHECK constraints — NULL-able (validate khi có giá trị)
-- ----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_gstt_bk_phan_loai_chuyen_mon'
       AND conrelid = 'public.gstt_dm_bang_kiem'::regclass
  ) THEN
    ALTER TABLE public.gstt_dm_bang_kiem
      ADD CONSTRAINT chk_gstt_bk_phan_loai_chuyen_mon
      CHECK (
        phan_loai_chuyen_mon IS NULL
        OR phan_loai_chuyen_mon IN (
          'PHONG_NGUA_CHUAN',
          'GOI_CAN_THIEP',
          'XU_LY_DUNG_CU',
          'MOI_TRUONG_CHAT_THAI',
          'CHUYEN_KHOA'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_gstt_bk_loai_giam_sat'
       AND conrelid = 'public.gstt_dm_bang_kiem'::regclass
  ) THEN
    ALTER TABLE public.gstt_dm_bang_kiem
      ADD CONSTRAINT chk_gstt_bk_loai_giam_sat
      CHECK (
        loai_giam_sat IS NULL
        OR loai_giam_sat IN ('TUAN_THU', 'NHAT_KY_VAN_HANH', 'DANH_GIA_HE_THONG')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_gstt_bk_doi_tuong_giam_sat'
       AND conrelid = 'public.gstt_dm_bang_kiem'::regclass
  ) THEN
    ALTER TABLE public.gstt_dm_bang_kiem
      ADD CONSTRAINT chk_gstt_bk_doi_tuong_giam_sat
      CHECK (
        doi_tuong_giam_sat IS NULL
        OR doi_tuong_giam_sat IN (
          'NHAN_VIEN',
          'NGUOI_BENH',
          'MOI_TRUONG',
          'THIET_BI',
          'ME_TIET_KHUAN'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_gstt_bk_cach_tinh_diem'
       AND conrelid = 'public.gstt_dm_bang_kiem'::regclass
  ) THEN
    ALTER TABLE public.gstt_dm_bang_kiem
      ADD CONSTRAINT chk_gstt_bk_cach_tinh_diem
      CHECK (
        cach_tinh_diem IS NULL
        OR cach_tinh_diem IN ('TY_LE', 'TRON_GOI', 'DAT_KHONG_DAT', 'NHAT_KY')
      );
  END IF;
END $$;

-- ----------------------------------------------------
-- 3. INDEX composite cho UI tab filter (Slice 5)
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gstt_bk_loai_doi_tuong
  ON public.gstt_dm_bang_kiem (loai_giam_sat, doi_tuong_giam_sat)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_gstt_bk_cach_tinh_diem
  ON public.gstt_dm_bang_kiem (cach_tinh_diem)
  WHERE is_active = true AND cach_tinh_diem IS NOT NULL;
