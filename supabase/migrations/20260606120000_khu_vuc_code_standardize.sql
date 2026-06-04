-- Chuẩn hóa mã KHU_VUC_GIAM_SAT:
--   KV_{ZONE}_{SLUG} — ZONE ∈ TR (Trắng), DO (Đỏ), VA (Vàng), XA (Xanh dương)
-- metadata: {"nhom_mau":"TR","thu_tu":101} — thu_tu = zone*100 + seq (101–108, 201–208, …)
-- Pilot: chưa có dữ liệu thực → DELETE toàn bộ category + seed lại.

BEGIN;

UPDATE public.gstt_fact_vst SET khu_vuc_id = NULL WHERE khu_vuc_id IS NOT NULL;
UPDATE public.gstt_fact_vst_sessions SET khu_vuc_id = NULL WHERE khu_vuc_id IS NOT NULL;
UPDATE public.gstt_fact_chung_sessions SET khu_vuc_id = NULL WHERE khu_vuc_id IS NOT NULL;

DELETE FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT';

INSERT INTO public.sys_lookup_value (id, category_type, code, name, description, is_active, metadata)
VALUES
  ('c1010001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_TR_ICU_SACH', 'ICU sạch / ICU chuyên sâu',
   'ICU có yêu cầu vô khuẩn cao; không dùng cho ICU hồi sức thông thường.', true,
   '{"nhom_mau":"TR","thu_tu":101}'::jsonb),
  ('c1010002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_TR_NB_MIEN_DICH', 'Khu NB suy giảm miễn dịch',
   'Ung thư, ghép tủy, bỏng, sơ sinh non tháng và NB suy giảm miễn dịch.', true,
   '{"nhom_mau":"TR","thu_tu":102}'::jsonb),
  ('c1010003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHONG_MO', 'Phòng mổ',
   'Phòng phẫu thuật có yêu cầu vô khuẩn/aseptic.', true,
   '{"nhom_mau":"TR","thu_tu":103}'::jsonb),
  ('c1010004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHONG_SINH', 'Phòng sinh',
   'Phòng đỡ đẻ, sinh mổ có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":104}'::jsonb),
  ('c1010005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_TR_CAN_THIEP', 'Phòng can thiệp mạch',
   'Buồng can thiệp nội mạch, thủ thuật mạch máu có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":105}'::jsonb),
  ('c1010006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_TR_THU_THUAT_SACH', 'Phòng thay băng sạch / thủ thuật vô khuẩn',
   'Thay băng vết mổ sạch, thủ thuật có yêu cầu vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":106}'::jsonb),
  ('c1010007-0000-4000-8000-000000000007', 'KHU_VUC_GIAM_SAT', 'KV_TR_CSSD_SACH', 'Trung tâm tiệt khuẩn — khu sạch',
   'Khu đóng gói, khu sạch sau tiệt khuẩn; không phải khu tiếp nhận/rửa bẩn.', true,
   '{"nhom_mau":"TR","thu_tu":107}'::jsonb),
  ('c1010008-0000-4000-8000-000000000008', 'KHU_VUC_GIAM_SAT', 'KV_TR_PHA_CHE', 'Pha chế dịch / thuốc vô khuẩn',
   'Đơn vị pha chế thuốc tập trung, pha chế dịch vô khuẩn.', true,
   '{"nhom_mau":"TR","thu_tu":108}'::jsonb),

  ('c1020001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_DO_ICU_CHUNG', 'ICU chung (hồi sức thường)',
   'ICU hồi sức tích cực không thuộc nhóm vô khuẩn cao (Trắng).', true,
   '{"nhom_mau":"DO","thu_tu":201}'::jsonb),
  ('c1020002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_DO_LOC_MAU', 'Khu lọc máu',
   'Đơn vị/chức năng lọc máu, chạy thận nhân tạo.', true,
   '{"nhom_mau":"DO","thu_tu":202}'::jsonb),
  ('c1020003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_DO_CAP_CUU', 'Khu cấp cứu',
   'Khu cấp cứu, hồi sức cấp cứu có tiếp xúc máu/dịch cơ thể.', true,
   '{"nhom_mau":"DO","thu_tu":203}'::jsonb),
  ('c1020004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_DO_CACH_LY', 'Tiếp nhận / cách ly truyền nhiễm',
   'NB truyền nhiễm theo quy định (cúm, SARS-CoV-2, sởi…).', true,
   '{"nhom_mau":"DO","thu_tu":204}'::jsonb),
  ('c1020005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_DO_DA_KHANG', 'Khu điều trị NB đa kháng kháng sinh',
   'NB mang hoặc nghi ngờ vi sinh vật đa kháng kháng sinh.', true,
   '{"nhom_mau":"DO","thu_tu":205}'::jsonb),
  ('c1020006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_DO_CSSD_BAN', 'Trung tâm tiệt khuẩn — khu bẩn',
   'Khu tiếp nhận, rửa sơ bộ, xử lý ban đầu dụng cụ bẩn trước tiệt khuẩn.', true,
   '{"nhom_mau":"DO","thu_tu":206}'::jsonb),
  ('c1020007-0000-4000-8000-000000000007', 'KHU_VUC_GIAM_SAT', 'KV_DO_CHAT_THAI', 'Khu lưu chất thải y tế tạm',
   'Khu tạm giữ rác y tế, chất thải lây nhiễm.', true,
   '{"nhom_mau":"DO","thu_tu":207}'::jsonb),
  ('c1020008-0000-4000-8000-000000000008', 'KHU_VUC_GIAM_SAT', 'KV_DO_VE_SINH', 'Nhà vệ sinh thuộc khu nguy cơ cao',
   'WC thuộc khu lây nhiễm cao (bồn cầu, bồn tiểu, sàn nhà vệ sinh).', true,
   '{"nhom_mau":"DO","thu_tu":208}'::jsonb),

  ('c1030001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_VA_NOI_TRU', 'Buồng bệnh nội trú thông thường',
   'Nội, ngoại, sản, nhi và phòng lâm sàng thông thường.', true,
   '{"nhom_mau":"VA","thu_tu":301}'::jsonb),
  ('c1030002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_VA_KHAM_TT', 'Phòng khám / buồng thủ thuật',
   'Khám bệnh, thủ thuật lâm sàng không thuộc vô khuẩn cao.', true,
   '{"nhom_mau":"VA","thu_tu":302}'::jsonb),
  ('c1030003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_VA_CDHA', 'Chẩn đoán hình ảnh',
   'X-quang, siêu âm, CT/MRI tại khu tiếp xúc NB.', true,
   '{"nhom_mau":"VA","thu_tu":303}'::jsonb),
  ('c1030004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_VA_XET_NGHIEM', 'Khu xét nghiệm lâm sàng',
   'Phòng lấy mẫu và xét nghiệm tiếp xúc NB.', true,
   '{"nhom_mau":"VA","thu_tu":304}'::jsonb),
  ('c1030005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_VA_VE_SINH', 'WC & khu giữ đồ bẩn khoa lâm sàng',
   'Nhà vệ sinh buồng bệnh, khu giữ đồ bẩn.', true,
   '{"nhom_mau":"VA","thu_tu":305}'::jsonb),
  ('c1030006-0000-4000-8000-000000000006', 'KHU_VUC_GIAM_SAT', 'KV_VA_BE_MAT_TBYT', 'Bề mặt TBYT tiếp xúc gần NB',
   'Giường, monitor, tay vịn và thiết bị tiếp xúc gần NB.', true,
   '{"nhom_mau":"VA","thu_tu":306}'::jsonb),

  ('c1040001-0000-4000-8000-000000000001', 'KHU_VUC_GIAM_SAT', 'KV_XA_HANH_CHINH', 'Khu hành chính / văn phòng',
   'Văn phòng, giao ban, phòng họp, buồng hành chính.', true,
   '{"nhom_mau":"XA","thu_tu":401}'::jsonb),
  ('c1040002-0000-4000-8000-000000000002', 'KHU_VUC_GIAM_SAT', 'KV_XA_SANH_CHO', 'Sảnh, hành lang, buồng chờ',
   'Quầy tiếp đón, sảnh, hành lang, khu chờ người nhà.', true,
   '{"nhom_mau":"XA","thu_tu":402}'::jsonb),
  ('c1040003-0000-4000-8000-000000000003', 'KHU_VUC_GIAM_SAT', 'KV_XA_NHAN_VIEN', 'Buồng nhân viên nội bộ',
   'Phòng nghỉ ca, buồng nhân viên.', true,
   '{"nhom_mau":"XA","thu_tu":403}'::jsonb),
  ('c1040004-0000-4000-8000-000000000004', 'KHU_VUC_GIAM_SAT', 'KV_XA_NHA_AN', 'Nhà ăn / khu ăn uống',
   'Khu ăn nhân viên hoặc công cộng (không khu NB).', true,
   '{"nhom_mau":"XA","thu_tu":404}'::jsonb),
  ('c1040005-0000-4000-8000-000000000005', 'KHU_VUC_GIAM_SAT', 'KV_XA_BE_MAT', 'Bề mặt công cộng không tiếp xúc NB',
   'Tay vịn hành lang, cửa… không phơi nhiễm máu/dịch, không tiếp xúc NB trực tiếp.', true,
   '{"nhom_mau":"XA","thu_tu":405}'::jsonb);

NOTIFY pgrst, 'reload schema';

COMMIT;
