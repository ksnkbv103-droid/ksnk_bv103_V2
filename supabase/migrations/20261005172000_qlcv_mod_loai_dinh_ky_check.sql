-- Soft-local MOD-QLCV · QLCV-05 B (CHƯA apply).
-- CHECK: loai_cong_viec = 'DINH_KY' ⇔ dinh_ky_mau_id IS NOT NULL.
-- An toàn khi bảng trống (prod 0 dòng). Nếu có vi phạm cũ: sửa trước khi apply.

-- Chuẩn hóa nhẹ dữ liệu cũ (nếu có): DINH_KY không mẫu → DOT_XUAT.
UPDATE public.qlcv_fact_cong_viec
SET loai_cong_viec = 'DOT_XUAT', updated_at = now()
WHERE loai_cong_viec = 'DINH_KY'
  AND dinh_ky_mau_id IS NULL;

ALTER TABLE public.qlcv_fact_cong_viec
  DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_loai_dinh_ky_mau_chk;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD CONSTRAINT qlcv_fact_cong_viec_loai_dinh_ky_mau_chk
  CHECK (
    (loai_cong_viec = 'DINH_KY' AND dinh_ky_mau_id IS NOT NULL)
    OR (loai_cong_viec IS DISTINCT FROM 'DINH_KY' AND dinh_ky_mau_id IS NULL)
  );

COMMENT ON CONSTRAINT qlcv_fact_cong_viec_loai_dinh_ky_mau_chk ON public.qlcv_fact_cong_viec IS
  'QLCV-05: DINH_KY chỉ khi có mẫu định kỳ; việc tay/import = DOT_XUAT.';
