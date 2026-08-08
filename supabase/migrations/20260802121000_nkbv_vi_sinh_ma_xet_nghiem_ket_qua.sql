-- NKBV vi sinh: mã xét nghiệm duy nhất + phân loại kết quả (âm / dương / nhiễu)
-- Additive; giữ ket_qua_duong_tinh đồng bộ từ ket_qua_phan_loai.

ALTER TABLE public.nkbv_fact_vi_sinh
  ADD COLUMN IF NOT EXISTS ma_xet_nghiem text,
  ADD COLUMN IF NOT EXISTS ket_qua_phan_loai text;

COMMENT ON COLUMN public.nkbv_fact_vi_sinh.ma_xet_nghiem IS
  'Mã xét nghiệm LIS duy nhất — khóa idempotency import (thay MD5 ghép).';
COMMENT ON COLUMN public.nkbv_fact_vi_sinh.ket_qua_phan_loai IS
  'DUONG_TINH | AM_TINH | NHIEU — kho đầy đủ để phân tích; chỉ DUONG_TINH Day-3 spawn phiếu.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nkbv_fact_vi_sinh_ket_qua_phan_loai_chk'
  ) THEN
    ALTER TABLE public.nkbv_fact_vi_sinh
      ADD CONSTRAINT nkbv_fact_vi_sinh_ket_qua_phan_loai_chk
      CHECK (
        ket_qua_phan_loai IS NULL
        OR ket_qua_phan_loai IN ('DUONG_TINH', 'AM_TINH', 'NHIEU')
      );
  END IF;
END $$;

-- Backfill phân loại từ boolean cũ
UPDATE public.nkbv_fact_vi_sinh
SET ket_qua_phan_loai = CASE
  WHEN ket_qua_duong_tinh IS TRUE THEN 'DUONG_TINH'
  ELSE 'AM_TINH'
END
WHERE ket_qua_phan_loai IS NULL;

-- Backfill mã XN tạm từ unique_key / id (chỉ để có giá trị; import mới bắt buộc mã thật)
UPDATE public.nkbv_fact_vi_sinh
SET ma_xet_nghiem = COALESCE(
  NULLIF(trim(ma_xet_nghiem), ''),
  NULLIF(trim(metadata ->> 'ma_xet_nghiem'), ''),
  NULLIF(trim(metadata ->> 'unique_key'), ''),
  'LEGACY-' || id::text
)
WHERE ma_xet_nghiem IS NULL OR trim(ma_xet_nghiem) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_nkbv_vi_sinh_ma_xet_nghiem_active
  ON public.nkbv_fact_vi_sinh (ma_xet_nghiem)
  WHERE is_active = true AND ma_xet_nghiem IS NOT NULL AND trim(ma_xet_nghiem) <> '';
