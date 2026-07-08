-- DOM-10: chuẩn hóa trang_thai QLCV về 7 mã canonical + thu hẹp CHECK.
-- Alias → canonical: CHUA_BAT_DAU→MOI, CHO_NHAN_VIEC/DANG_THUC_HIEN→DANG_LAM,
-- CHO_XAC_NHAN_HOAN_THANH→CHO_DUYET. App vẫn đọc alias ở display layer nếu còn.

BEGIN;

UPDATE public.qlcv_fact_cong_viec
SET
  trang_thai = CASE trang_thai
    WHEN 'CHUA_BAT_DAU' THEN 'MOI'
    WHEN 'CHO_NHAN_VIEC' THEN 'DANG_LAM'
    WHEN 'DANG_THUC_HIEN' THEN 'DANG_LAM'
    WHEN 'CHO_XAC_NHAN_HOAN_THANH' THEN 'CHO_DUYET'
    ELSE trang_thai
  END,
  updated_at = now()
WHERE trang_thai IN (
  'CHUA_BAT_DAU',
  'CHO_NHAN_VIEC',
  'DANG_THUC_HIEN',
  'CHO_XAC_NHAN_HOAN_THANH'
);

ALTER TABLE public.qlcv_fact_cong_viec
  DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_trang_thai_check;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD CONSTRAINT qlcv_fact_cong_viec_trang_thai_check CHECK (
    trang_thai = ANY (ARRAY[
      'MOI',
      'DANG_LAM',
      'CHO_DUYET',
      'HOAN_THANH',
      'TU_CHOI',
      'QUA_HAN',
      'DA_HUY'
    ]::text[])
  );

COMMENT ON CONSTRAINT qlcv_fact_cong_viec_trang_thai_check ON public.qlcv_fact_cong_viec IS
  '7 mã canonical Track B (DOM-10 2026-07-09). Alias legacy đã backfill.';

NOTIFY pgrst, 'reload schema';

COMMIT;
