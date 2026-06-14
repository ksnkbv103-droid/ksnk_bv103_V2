-- BK áp dụng: phạm vi khoa/khối + bắt buộc TGS/KSNK (ap_dung_jsonb).
-- Backfill từ metadata loai_giam_sat / phan_loai_chuyen_mon — không gán khoa chuyên khoa cụ thể.

BEGIN;

ALTER TABLE public.gstt_dm_bang_kiem
  ADD COLUMN IF NOT EXISTS ap_dung_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.gstt_dm_bang_kiem.ap_dung_jsonb IS
  'Quy định phạm vi áp dụng BK: pham_vi, khoa/khối, bat_buoc TGS/KSNK, muc_do. SSOT resolve nghĩa vụ khoa×BK.';

WITH ksnk_exclude AS (
  SELECT COALESCE(array_agg(k.id), ARRAY[]::uuid[]) AS ids
  FROM public.mdm_dm_khoa_phong k
  WHERE COALESCE(k.is_active, true) = true
    AND (
      UPPER(BTRIM(k.ma_khoa)) IN ('KSNK', 'C18')
      OR k.ten_khoa ILIKE '%kiểm soát%nhiễm%'
      OR k.ten_khoa ILIKE '%kiem soat%nhiem%'
    )
)
UPDATE public.gstt_dm_bang_kiem bk
SET ap_dung_jsonb = CASE
  WHEN bk.loai_giam_sat = 'DANH_GIA_HE_THONG'
    OR bk.phan_loai_chuyen_mon = 'QUAN_TRI_HE_THONG' THEN
    jsonb_build_object(
      'pham_vi', 'CHI_KSNK',
      'khoi_ids', '[]'::jsonb,
      'khoa_ids', '[]'::jsonb,
      'khoa_loai_tru', '[]'::jsonb,
      'bat_buoc', jsonb_build_object('tu_giam_sat', false, 'ksnk_giam_sat', true),
      'muc_do', 'BAT_BUOC',
      'ghi_chu', 'Seed: đánh giá hệ thống / quản trị — chỉ KSNK'
    )
  WHEN bk.phan_loai_chuyen_mon = 'CHUYEN_KHOA'
    OR bk.loai_giam_sat = 'NHAT_KY_VAN_HANH' THEN
    jsonb_build_object(
      'pham_vi', 'THEO_KHOA',
      'khoi_ids', '[]'::jsonb,
      'khoa_ids', '[]'::jsonb,
      'khoa_loai_tru', '[]'::jsonb,
      'bat_buoc', jsonb_build_object(
        'tu_giam_sat', COALESCE(bk.loai_giam_sat <> 'DANH_GIA_HE_THONG', true),
        'ksnk_giam_sat', COALESCE(bk.loai_giam_sat = 'TUAN_THU', false)
      ),
      'muc_do', 'BAT_BUOC',
      'ghi_chu', 'Seed: chuyên khoa / nhật ký — cần chọn khoa trên form MDM'
    )
  ELSE
    jsonb_build_object(
      'pham_vi', 'CA_VIEN',
      'khoi_ids', '[]'::jsonb,
      'khoa_ids', '[]'::jsonb,
      'khoa_loai_tru', to_jsonb((SELECT ids FROM ksnk_exclude)),
      'bat_buoc', jsonb_build_object('tu_giam_sat', true, 'ksnk_giam_sat', true),
      'muc_do', 'BAT_BUOC',
      'ghi_chu', 'Seed: tuân thủ cả viện (trừ KSNK)'
    )
END
WHERE bk.ap_dung_jsonb = '{}'::jsonb;

COMMIT;
