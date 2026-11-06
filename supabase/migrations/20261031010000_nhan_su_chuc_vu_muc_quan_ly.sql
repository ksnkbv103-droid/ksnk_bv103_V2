-- Chức vụ: thêm Hành chính trưởng, Tổ trưởng; mỗi chức vụ có mức quản lý (metadata.muc_quan_ly).
-- Mức: CHI_HUY | TO_TRUONG | NHAN_VIEN. Không đổi hồ sơ người, không đổi quyền hệ thống.

BEGIN;

INSERT INTO public.sys_lookup_value (category_type, code, name, is_active)
VALUES
  ('CHUC_VU', 'CV_HANH_CHINH_TRUONG', 'Hành chính trưởng', true),
  ('CHUC_VU', 'CV_TO_TRUONG', 'Tổ trưởng', true)
ON CONFLICT (category_type, code) DO NOTHING;

UPDATE public.sys_lookup_value
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'muc_quan_ly',
      CASE code
        WHEN 'CV_CHU_NHIEM' THEN 'CHI_HUY'
        WHEN 'CV_PHO_CHU_NHIEM' THEN 'CHI_HUY'
        WHEN 'CV_HANH_CHINH_TRUONG' THEN 'CHI_HUY'
        WHEN 'CV_TO_TRUONG' THEN 'TO_TRUONG'
        WHEN 'CV_DIEU_DUONG_TRUONG' THEN 'TO_TRUONG'
        ELSE 'NHAN_VIEN'
      END
    ),
    updated_at = now()
WHERE category_type = 'CHUC_VU'
  AND code IN (
    'CV_CHU_NHIEM', 'CV_PHO_CHU_NHIEM', 'CV_HANH_CHINH_TRUONG',
    'CV_TO_TRUONG', 'CV_DIEU_DUONG_TRUONG', 'CV_NHAN_VIEN'
  );

COMMIT;
