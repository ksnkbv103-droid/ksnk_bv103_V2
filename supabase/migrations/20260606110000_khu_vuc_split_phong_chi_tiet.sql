-- Tách TRANG_PHAU_THUAT và DO_PHOI_NHIEM thành mã phòng riêng.

BEGIN;

UPDATE public.sys_lookup_value
SET is_active = false, updated_at = now()
WHERE category_type = 'KHU_VUC_GIAM_SAT'
  AND code IN ('TRANG_PHAU_THUAT', 'DO_PHOI_NHIEM');

INSERT INTO public.sys_lookup_value (category_type, code, name, description, is_active, metadata)
SELECT v.category_type, v.code, v.name, v.description, true, v.metadata::jsonb
FROM (VALUES
  ('KHU_VUC_GIAM_SAT', 'TRANG_PHONG_MO', 'Phòng mổ',
   'Phòng phẫu thuật có yêu cầu vô khuẩn/aseptic.',
   '{"nhom_mau":"TRANG","thu_tu":31}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_PHONG_SINH', 'Phòng sinh',
   'Phòng đỡ đẻ, sinh mổ có yêu cầu vô khuẩn.',
   '{"nhom_mau":"TRANG","thu_tu":32}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_PHONG_CAN_THIEP', 'Phòng can thiệp mạch',
   'Buồng can thiệp nội mạch, thủ thuật mạch máu có yêu cầu vô khuẩn.',
   '{"nhom_mau":"TRANG","thu_tu":33}'),
  ('KHU_VUC_GIAM_SAT', 'DO_LOC_MAU', 'Khu lọc máu',
   'Đơn vị/chức năng lọc máu, chạy thận nhân tạo.',
   '{"nhom_mau":"DO","thu_tu":121}'),
  ('KHU_VUC_GIAM_SAT', 'DO_CAP_CUU', 'Khu cấp cứu',
   'Khu cấp cứu, hồi sức cấp cứu có tiếp xúc máu/dịch cơ thể.',
   '{"nhom_mau":"DO","thu_tu":122}')
) AS v(category_type, code, name, description, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sys_lookup_value e
  WHERE e.category_type = v.category_type AND e.code = v.code
);

NOTIFY pgrst, 'reload schema';

COMMIT;
