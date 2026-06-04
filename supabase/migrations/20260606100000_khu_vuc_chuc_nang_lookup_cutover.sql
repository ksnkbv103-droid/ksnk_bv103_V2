-- KHU_VUC_GIAM_SAT: 4 mã màu → 24 chức năng khu vực (metadata.nhom_mau).
-- Xóa lookup NGUYEN_NHAN_LOI / HANH_DONG_CAN_THIEP (không còn dùng app).

BEGIN;

DELETE FROM public.sys_lookup_value
WHERE category_type IN ('NGUYEN_NHAN_LOI', 'HANH_DONG_CAN_THIEP');

UPDATE public.sys_lookup_value
SET is_active = false, updated_at = now()
WHERE category_type = 'KHU_VUC_GIAM_SAT'
  AND code IN ('TRANG', 'DO', 'VANG', 'XANH');

INSERT INTO public.sys_lookup_value (category_type, code, name, description, is_active, metadata)
SELECT v.category_type, v.code, v.name, v.description, true, v.metadata::jsonb
FROM (VALUES
  ('KHU_VUC_GIAM_SAT', 'TRANG_ICU_SACH', 'ICU sạch / ICU chuyên sâu',
   'ICU có yêu cầu vô khuẩn cao; không dùng cho ICU hồi sức thông thường.',
   '{"nhom_mau":"TRANG","thu_tu":10}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_NB_MIEN_DICH', 'Khu NB suy giảm miễn dịch',
   'Ung thư, ghép tủy, bỏng, sơ sinh non tháng và NB suy giảm miễn dịch.',
   '{"nhom_mau":"TRANG","thu_tu":20}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_PHAU_THUAT', 'Phòng mổ, phòng sinh, buồng can thiệp mạch',
   'Khu phẫu thuật và can thiệp có yêu cầu aseptic/vô khuẩn.',
   '{"nhom_mau":"TRANG","thu_tu":30}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_THU_THUAT_SACH', 'Phòng thay băng sạch / thủ thuật vô khuẩn',
   'Thay băng vết mổ sạch, thủ thuật có yêu cầu vô khuẩn.',
   '{"nhom_mau":"TRANG","thu_tu":40}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_CSSD_SACH', 'Trung tâm tiệt khuẩn — khu sạch',
   'Khu đóng gói, khu sạch sau tiệt khuẩn; không phải khu tiếp nhận/rửa bẩn.',
   '{"nhom_mau":"TRANG","thu_tu":50}'),
  ('KHU_VUC_GIAM_SAT', 'TRANG_PHA_CHE', 'Pha chế dịch / thuốc vô khuẩn',
   'Đơn vị pha chế thuốc tập trung, pha chế dịch vô khuẩn.',
   '{"nhom_mau":"TRANG","thu_tu":60}'),

  ('KHU_VUC_GIAM_SAT', 'DO_ICU_CHUNG', 'ICU chung (hồi sức thường)',
   'ICU hồi sức tích cực không thuộc nhóm vô khuẩn cao (Trắng).',
   '{"nhom_mau":"DO","thu_tu":110}'),
  ('KHU_VUC_GIAM_SAT', 'DO_PHOI_NHIEM', 'Khu phơi nhiễm máu / dịch cơ thể',
   'Lọc máu, cấp cứu và khu có tiếp xúc máu/dịch cơ thể.',
   '{"nhom_mau":"DO","thu_tu":120}'),
  ('KHU_VUC_GIAM_SAT', 'DO_CACH_LY', 'Tiếp nhận / cách ly truyền nhiễm',
   'NB truyền nhiễm theo quy định (cúm, SARS-CoV-2, sởi…).',
   '{"nhom_mau":"DO","thu_tu":130}'),
  ('KHU_VUC_GIAM_SAT', 'DO_DA_KHANG', 'Khu điều trị NB đa kháng kháng sinh',
   'NB mang hoặc nghi ngờ vi sinh vật đa kháng kháng sinh.',
   '{"nhom_mau":"DO","thu_tu":140}'),
  ('KHU_VUC_GIAM_SAT', 'DO_CSSD_BAN', 'Trung tâm tiệt khuẩn — khu bẩn',
   'Khu tiếp nhận, rửa sơ bộ, xử lý ban đầu dụng cụ bẩn trước tiệt khuẩn.',
   '{"nhom_mau":"DO","thu_tu":145}'),
  ('KHU_VUC_GIAM_SAT', 'DO_CHAT_THAI', 'Khu lưu chất thải y tế tạm',
   'Khu tạm giữ rác y tế, chất thải lây nhiễm.',
   '{"nhom_mau":"DO","thu_tu":150}'),
  ('KHU_VUC_GIAM_SAT', 'DO_VE_SINH', 'Nhà vệ sinh thuộc khu nguy cơ cao',
   'WC thuộc khu lây nhiễm cao (bồn cầu, bồn tiểu, sàn nhà vệ sinh).',
   '{"nhom_mau":"DO","thu_tu":160}'),

  ('KHU_VUC_GIAM_SAT', 'VANG_NOI_TRU', 'Buồng bệnh nội trú thông thường',
   'Nội, ngoại, sản, nhi và phòng lâm sàng thông thường.',
   '{"nhom_mau":"VANG","thu_tu":210}'),
  ('KHU_VUC_GIAM_SAT', 'VANG_KHAM_THU_THUAT', 'Phòng khám / buồng thủ thuật',
   'Khám bệnh, thủ thuật lâm sàng không thuộc vô khuẩn cao.',
   '{"nhom_mau":"VANG","thu_tu":220}'),
  ('KHU_VUC_GIAM_SAT', 'VANG_CDHA', 'Chẩn đoán hình ảnh',
   'X-quang, siêu âm, CT/MRI tại khu tiếp xúc NB.',
   '{"nhom_mau":"VANG","thu_tu":230}'),
  ('KHU_VUC_GIAM_SAT', 'VANG_XET_NGHIEM', 'Khu xét nghiệm lâm sàng',
   'Phòng lấy mẫu và xét nghiệm tiếp xúc NB.',
   '{"nhom_mau":"VANG","thu_tu":240}'),
  ('KHU_VUC_GIAM_SAT', 'VANG_VE_SINH_DO_BAN', 'WC & khu giữ đồ bẩn khoa lâm sàng',
   'Nhà vệ sinh buồng bệnh, khu giữ đồ bẩn.',
   '{"nhom_mau":"VANG","thu_tu":250}'),
  ('KHU_VUC_GIAM_SAT', 'VANG_BE_MAT_TBYT', 'Bề mặt TBYT tiếp xúc gần NB',
   'Giường, monitor, tay vịn và thiết bị tiếp xúc gần NB.',
   '{"nhom_mau":"VANG","thu_tu":260}'),

  ('KHU_VUC_GIAM_SAT', 'XANH_HANH_CHINH', 'Khu hành chính / văn phòng',
   'Văn phòng, giao ban, phòng họp, buồng hành chính.',
   '{"nhom_mau":"XANH","thu_tu":310}'),
  ('KHU_VUC_GIAM_SAT', 'XANH_CHO_SANH', 'Sảnh, hành lang, buồng chờ',
   'Quầy tiếp đón, sảnh, hành lang, khu chờ người nhà.',
   '{"nhom_mau":"XANH","thu_tu":320}'),
  ('KHU_VUC_GIAM_SAT', 'XANH_NHAN_SU', 'Buồng nhân viên nội bộ',
   'Phòng nghỉ ca, buồng nhân viên.',
   '{"nhom_mau":"XANH","thu_tu":330}'),
  ('KHU_VUC_GIAM_SAT', 'XANH_NHA_AN', 'Nhà ăn / khu ăn uống',
   'Khu ăn nhân viên hoặc công cộng (không khu NB).',
   '{"nhom_mau":"XANH","thu_tu":340}'),
  ('KHU_VUC_GIAM_SAT', 'XANH_BE_MAT_CONG_CONG', 'Bề mặt công cộng không tiếp xúc NB',
   'Tay vịn hành lang, cửa… không phơi nhiễm máu/dịch, không tiếp xúc NB trực tiếp.',
   '{"nhom_mau":"XANH","thu_tu":350}')
) AS v(category_type, code, name, description, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sys_lookup_value e
  WHERE e.category_type = v.category_type AND e.code = v.code
);

NOTIFY pgrst, 'reload schema';

COMMIT;
