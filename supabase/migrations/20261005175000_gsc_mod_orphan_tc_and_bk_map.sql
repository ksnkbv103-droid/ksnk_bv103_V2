-- Soft local MOD-GSC — map tiêu chí mồ côi + short↔dài (FILE ONLY, chưa apply).
-- FIX-MIG-ORDER: rename từ 20261005080000 → sau GS-05/QLCV (phụ thuộc trước 175100).
-- Lead SELECT 05/10: 5384 KQ orphan sau SCR 28/9. Không sửa results_jsonb.
-- new_criterion_id resolve lúc APPLY theo ma_bk_long + new_ma_tc/stt/noi_dung.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gstt_map_tieu_chi_orphan (
  old_criterion_id uuid PRIMARY KEY,
  ma_bk_short text,
  ma_bk_long text,
  old_stt int,
  old_ma_tc text,
  old_noi_dung text NOT NULL,
  new_ma_tc text,
  new_stt int,
  new_criterion_id uuid,
  match_confidence text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gstt_map_tieu_chi_orphan IS
  'GSC orphan TC map (SCR 28/9). View/RPC đọc tên cũ khi thiếu new_id; không sửa results_jsonb.';

CREATE TABLE IF NOT EXISTS public.gstt_map_bang_kiem_short_long (
  ma_bk_short text PRIMARY KEY,
  ma_bk_long text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.gstt_map_bang_kiem_short_long (ma_bk_short, ma_bk_long) VALUES
('BM.07.02', 'KSNK.QT.07.BM.02'),
('BM.07.03', 'KSNK.QT.07.BM.03'),
('BM.03.03', 'KSNK.QT.03.BM.03'),
('BM.08.01', 'KSNK.QT.08.BM.01'),
('BM.09.01', 'KSNK.QT.09.BM.01'),
('BM.12.01', 'KSNK.QT.12.BM.01'),
('BM.14.01', 'KSNK.QT.14.BM.01'),
('BM.15.01', 'KSNK.QT.15.BM.01'),
('BM.16.01', 'KSNK.QT.16.BM.01'),
('BM.17.01', 'KSNK.QT.17.BM.01'),
('BM.18.02', 'KSNK.QT.18.BM.02'),
('BM.20.02', 'KSNK.QT.20.BM.01'),
('BM.21.04', 'KSNK.QT.22.BM.04'),
('BM.24.02', 'KSNK.QT.29.BM.02'),
('BM.25.01', 'KSNK.QT.30.BM.01'),
('BM.25.03', 'KSNK.QT.30.BM.02'),
('BM.26.01', 'KSNK.QT.32.BM.01'),
('BM.27.01', 'KSNK.QT.31.BM.01'),
('BM.27.02', 'KSNK.QT.31.BM.01'),
('BM.31.03', 'KSNK.QT.36.BM.03'),
('BM.QĐ.02.01', 'KSNK.QĐ.08.BM.01'),
('BM.QĐ.03.01', 'KSNK.QĐ.09.BM.01'),
('BM.QĐ.09.01', 'KSNK.QĐ.16.BM.01'),
('BM.QĐ.12.01', 'KSNK.QĐ.14.BM.01'),
('BM.QĐ.16.01', 'KSNK.QĐ.19.BM.01'),
('BM.QĐ.18.02', 'KSNK.QĐ.21.BM.02')
ON CONFLICT (ma_bk_short) DO UPDATE SET ma_bk_long = EXCLUDED.ma_bk_long;

INSERT INTO public.gstt_map_tieu_chi_orphan (
  old_criterion_id, ma_bk_short, ma_bk_long, old_stt, old_ma_tc, old_noi_dung, new_ma_tc, new_stt, match_confidence
) VALUES
('b4ae98d5-68a7-47c8-967a-62673d72de64'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 1, '1201', 'Tháo bỏ toàn bộ trang sức (nhẫn, đồng hồ, vòng)', 'TC01', 1, 'exact'),
('55a4046e-320a-47bc-a9f8-9bacb4ed3f6f'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 2, '1202', 'Móng tay cắt ngắn, sạch, không sơn', 'TC03', 3, 'fuzzy'),
('34e4c042-bd17-4fd8-a6c2-cdef2aa781f5'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 3, '1203', 'Bước đệm: Thực hiện VST thường quy bằng xà phòng và làm sạch dưới móng tay', 'TC02', 2, 'uncertain'),
('77e07d8c-09ec-4ebf-8617-dd08fdb54b26'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 4, '1204', 'Thực hiện 6 bước VST cho bàn tay, chà kỹ kẽ ngón, đầu móng', 'TC04', 4, 'fuzzy'),
('0b02ca46-a21c-45eb-a304-20a227284231'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 5, '1205', 'Chà tuần tự: Cổ tay → Cẳng tay (chia 3 phần) → Khuỷu tay', 'TC04', 4, 'uncertain'),
('91300e94-cea5-4717-b8db-650bd02fed8a'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 6, '1206', 'Tư thế: Luôn giữ bàn tay cao hơn khuỷu tay trong suốt quá trình', 'TC09', 9, 'fuzzy'),
('3f8f26fe-75be-41fe-b361-787c6ff07f08'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 7, '1207', 'Rửa dưới vòi (tay cao) và lau khô bằng khăn vô khuẩn (nếu dùng xà phòng)', 'TC05', 5, 'fuzzy'),
('0829d786-63ac-4f11-8fb4-b5daa12fcc60'::uuid, 'BM.07.03', 'KSNK.QT.07.BM.03', 8, '1208', 'Để khô tự nhiên, không lau lại (nếu dùng dung dịch cồn)', 'TC08', 8, 'uncertain'),
('75950df0-4cc1-4e3c-a635-2cb6329a418e'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 1, '1101', 'Tháo bỏ trang sức (nhẫn, đồng hồ) khỏi tay', 'TC01', 1, 'uncertain'),
('fa53a87b-ffa9-466f-b91c-369e2eeda312'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 2, '1102', 'Làm ướt tay bằng nước sạch và lấy đủ lượng xà phòng (3-5ml)', NULL, NULL, 'none'),
('4b70347a-8167-4686-935c-3f088f73ebd8'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 3, '1103', 'Bước 1: Chà 2 lòng bàn tay vào nhau', 'TC08', 8, 'fuzzy'),
('7a8dd9db-5882-4fd0-95a0-019dc703ef4b'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 4, '1104', 'Bước 2: Chà lòng bàn tay này lên mu/kẽ ngón tay kia (và ngược lại)', 'TC04', 4, 'fuzzy'),
('d68f0628-e817-4a54-b798-59849712da0f'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 5, '1105', 'Bước 3: Chà 2 lòng bàn tay vào nhau, miết mạnh kẽ ngón tay', 'TC08', 8, 'fuzzy'),
('98e19906-8e9d-4841-a6dc-2ae2d8172121'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 6, '1106', 'Bước 4: Chà mặt ngoài các ngón tay (khum tay) vào lòng bàn tay kia', 'TC06', 6, 'fuzzy'),
('30eeeeaa-cc55-494e-b66a-4d51116a40f8'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 7, '1107', 'Bước 5: Xoay ngón tay cái của tay này vào lòng bàn tay kia (và ngược lại)', 'TC04', 4, 'fuzzy'),
('5847b148-9442-43fc-b962-a4cf29bb4c8e'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 8, '1108', 'Bước 6: Chụm 5 đầu ngón tay này xoay vào lòng bàn tay kia', 'TC08', 8, 'fuzzy'),
('badf1fd2-378e-462d-9768-8e1b44602743'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 9, '1109', 'Làm sạch tay dưới vòi nước (để tay xuôi)', 'TC11', 11, 'uncertain'),
('8749d019-a6e4-42b2-a6bb-007b8b797f1c'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 10, '1110', 'Lau khô tay bằng khăn sạch/giấy dùng 1 lần', 'TC11', 11, 'fuzzy'),
('dc603603-095a-4bec-8e72-68ff0ff39b89'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 11, '1111', 'Dùng khăn giấy vừa lau tay để tắt vòi nước (tránh tái nhiễm)', 'TC11', 11, 'uncertain'),
('f59eeff1-b88d-439a-a385-287476a412fc'::uuid, 'BM.07.02', 'KSNK.QT.07.BM.02', 12, '1112', 'Thời gian: Toàn bộ quá trình thực hiện đủ 40-60 giây (hoặc 20-30s với cồn)', NULL, NULL, 'none'),
('3425c773-37ad-42b7-a6f3-e08110a93f0e'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 1, '3301', 'Có đủ 4 loại thùng/túi (Vàng, đen, xanh, trắng) tại vị trí quy định?', 'TC01', 1, 'uncertain'),
('a0ede7ac-c475-4fec-9aea-8adb0242f102'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 2, '3302', 'Thùng/túi đúng màu sắc, có biểu tượng/cảnh báo lây nhiễm rõ ràng?', NULL, NULL, 'none'),
('49e9050f-3286-4e90-9885-a5881f7c4aa6'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 3, '3303', 'Thùng có nắp đậy (ưu tiên đạp chân), sạch sẽ, không bị rò rỉ nước?', 'TC06', 6, 'fuzzy'),
('45568486-e022-45a9-bde7-20c21bd261a4'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 4, '3304', 'Thùng VÀNG (Lây nhiễm): KHÔNG bị lẫn rác sinh hoạt/tái chế?', 'TC02', 2, 'uncertain'),
('103b993a-7c03-4231-8d8e-7584ffe15096'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 5, '3305', 'Thùng XANH (Sinh hoạt): KHÔNG bị lẫn rác lây nhiễm (bông gạc...)?', 'TC02', 2, 'uncertain'),
('f532406f-b8a6-452d-a902-a426c951cbc6'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 6, '3306', 'Hộp sắc nhọn: Có sẵn, đúng vị trí, không bị đầy quá vạch 3/4?', 'TC03', 3, 'uncertain'),
('1bf4fac8-fdc8-4227-a3be-fbdcd00490eb'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 7, '3307', 'Hộp sắc nhọn: KHÔNG chứa rác thải loại khác (bông, bao bì, vỏ kim...)?', NULL, NULL, 'none'),
('d0e0490d-eb87-4c59-82f0-ed9162d1e3a2'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 8, '3308', 'NVVS có mang PTPH (găng tay cao chỉ, khẩu trang) khi đi thu gom?', 'TC07', 7, 'uncertain'),
('9bc66ee5-b20f-4ff3-a218-3ccc237c71f6'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 9, '3309', 'Túi rác có được buộc chặt cổ túi (cổ ngỗng) trước khi vận chuyển?', NULL, NULL, 'none'),
('b5b74fad-7569-4334-bcea-83aad33a6ecd'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 10, '3310', 'Hộp sắc nhọn có được đậy/khóa nắp an toàn khi vận chuyển đi (khi đã đầy)?', 'TC08', 8, 'uncertain'),
('e95c33e2-8f9b-4a55-9153-0a0d456c212c'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 11, '3311', 'Rác có được thu gom đúng tần suất (không để tồn đọng > 48h tại khoa)?', NULL, NULL, 'none'),
('07373884-dc19-4123-9323-cbb5f805c955'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 12, '3312', 'Thùng rác tại chỗ có được vệ sinh sạch sẽ sau khi lấy túi rác ra?', NULL, NULL, 'none'),
('712dbd46-fafb-42c1-9d37-e00c6701c14f'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 13, '3313', 'Xe vận chuyển rác có nắp đậy, kín, sạch sẽ, đúng chủng loại?', 'TC08', 8, 'uncertain'),
('2b0ac75b-2f93-42d6-b4b4-20a21afbb9e4'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 14, '3314', 'Tuân thủ vận chuyển rác đúng luồng, đúng giờ quy định của Bệnh viện?', NULL, NULL, 'none'),
('9005afd7-27d6-46c2-ae93-0999ecb4c26b'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 15, '3315', 'Khu lưu giữ rác tập trung có sạch sẽ, có khóa, phân chia khu vực rõ ràng?', NULL, NULL, 'none'),
('f7cedf2e-20d0-4b37-8fe1-2553688523e4'::uuid, 'BM.12.01', 'KSNK.QT.12.BM.01', 16, '3316', 'Khu lưu giữ chất thải lây nhiễm đảm bảo thời gian (<48h) hoặc có kho lạnh?', NULL, NULL, 'none'),
('4178b6f0-4e3a-465c-a169-5291ab94e004'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 1, '3601', 'NB được bố trí nằm phòng riêng hoặc ghép nhóm (Cohort) với NB cùng loại MDROs?', 'TC01', 1, 'uncertain'),
('71792854-957c-4d89-b391-449d10ce0acd'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 2, '3602', 'Có biển báo Cách ly tiếp xúc (Màu vàng) treo trước cửa phòng?', 'TC02', 2, 'fuzzy'),
('c1848744-1305-4cf8-8f40-81f4260e4604'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 3, '3603', 'Có sẵn phương tiện vệ sinh tay và PTPH (găng, áo choàng) ngay trước cửa phòng?', NULL, NULL, 'none'),
('22b2be3b-9521-4725-b891-bed8dd5053cc'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 4, '3604', 'NVYT tuân thủ VST và mặc áo choàng, mang găng TRƯỚC KHI tiếp xúc NB/môi trường xung quanh?', 'TC04', 4, 'fuzzy'),
('581efbe0-c81e-4c95-ae4e-47cf6779c046'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 5, '3605', 'Tháo bỏ PTPH và VST NGAY TRƯỚC KHI rời khỏi phòng cách ly?', 'TC05', 5, 'fuzzy'),
('f6b2eb04-841d-4dab-882c-1625b5933689'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 6, '3606', 'Các thiết bị y tế (ống nghe, nhiệt kế, HA kế) được dùng riêng (hoặc khử khuẩn kỹ nếu dùng chung)?', 'TC06', 6, 'uncertain'),
('0d0a7aee-8a94-467a-beab-6a731fd87ac4'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 7, '3607', 'Vệ sinh môi trường được thực hiện tăng cường bằng hóa chất khử khuẩn ít nhất 2 lần/ngày?', NULL, NULL, 'none'),
('ed60be75-724e-42a3-8314-52008af4f694'::uuid, 'BM.31.03', 'KSNK.QT.36.BM.03', 8, '3608', 'Rác thải lây nhiễm và đồ vải bẩn của NB được thu gom đúng quy trình cách ly tiếp xúc?', NULL, NULL, 'none'),
('ea547648-28eb-4c7d-bcbf-ca4ee96e6140'::uuid, 'BM.11.01', NULL, 1, '3101', 'NVVS mang đúng PTPH (găng tay, khẩu trang...)?', NULL, NULL, 'none'),
('6266ab00-955d-438d-94a8-6119b9f80b13'::uuid, 'BM.11.01', NULL, 2, '3102', 'Xe VSMT sạch sẽ, đầy đủ dụng cụ, hóa chất?', NULL, NULL, 'none'),
('cbfa666d-cfd4-4076-ba0b-470124b00423'::uuid, 'BM.11.01', NULL, 3, '3103', 'Hóa chất được pha và dán nhãn đúng (tên, nồng độ, ngày pha)?', NULL, NULL, 'none'),
('4d525ac6-46ed-4b79-9fa3-6d5239394389'::uuid, 'BM.11.01', NULL, 4, '3104', 'Có đặt biển báo Sàn ướt khi lau sàn?', NULL, NULL, 'none'),
('3dba5d9a-5c3b-44d0-9d63-7c073dc2b957'::uuid, 'BM.11.01', NULL, 5, '3105', 'Tuân thủ mã màu xô, giẻ lau theo quy định?', NULL, NULL, 'none'),
('a532b760-453d-4e7f-bfa3-ba71d68ddd83'::uuid, 'BM.11.01', NULL, 6, '3106', 'Kỹ thuật lau đúng (Từ trên xuống, sạch đến bẩn, 1 chiều/ziczac)?', NULL, NULL, 'none'),
('9bd05530-4281-4497-a2d8-2a55edb66ca8'::uuid, 'BM.11.01', NULL, 7, '3107', 'Tuyệt đối KHÔNG dùng chổi quét khô ở khu vực điều trị?', NULL, NULL, 'none'),
('1f626300-1cb1-4087-8a23-231452b43e4a'::uuid, 'BM.11.01', NULL, 8, '3108', 'Dụng cụ được vệ sinh, phơi khô sau khi sử dụng?', NULL, NULL, 'none'),
('c5cc188a-8532-48c3-a467-3d5ae9904dbf'::uuid, 'BM.11.01', NULL, 9, '3109', 'Sàn nhà sạch sẽ, không rác, không vệt ố?', NULL, NULL, 'none'),
('73457086-2121-461e-be67-119bb5a828f0'::uuid, 'BM.11.01', NULL, 10, '3110', 'Hành lang chung sạch sẽ, thông thoáng?', NULL, NULL, 'none'),
('7c5f2e17-00ca-4b97-87ef-16f799df36df'::uuid, 'BM.11.01', NULL, 11, '3111', 'Tay nắm cửa (Phòng bệnh/Toilet) sạch sẽ?', NULL, NULL, 'none'),
('ea53e1c3-c231-466a-87d3-997a6a0b4c5b'::uuid, 'BM.11.01', NULL, 12, '3112', 'Thanh chắn giường sạch sẽ, không bám bụi/máu?', NULL, NULL, 'none'),
('9330fe24-f82b-4a17-a4d0-ae4d508b3fe8'::uuid, 'BM.11.01', NULL, 13, '3113', 'Bàn đầu giường sạch, sắp xếp gọn gàng?', NULL, NULL, 'none'),
('d6fa3035-d837-4057-8552-562ae952ed0d'::uuid, 'BM.11.01', NULL, 14, '3114', 'Công tắc điện sạch sẽ, không bám vân tay/bẩn?', NULL, NULL, 'none'),
('4b201f8a-7e84-4f03-b933-e8d90803d60f'::uuid, 'BM.11.01', NULL, 15, '3115', 'Nút bấm thang máy / Tay vịn cầu thang sạch sẽ?', NULL, NULL, 'none'),
('864bebd5-584f-4626-9113-a76fea1fb138'::uuid, 'BM.11.01', NULL, 16, '3116', 'Nhà vệ sinh (Bồn rửa, bồn cầu, sàn) sạch sẽ, không mùi?', NULL, NULL, 'none'),
('387c5905-1012-4791-b322-cb7457a49df6'::uuid, 'BM.11.01', NULL, 17, '3117', 'Điều dưỡng có lau khử khuẩn thiết bị (ống nghe, HA kế...) giữa các NB?', NULL, NULL, 'none'),
('d09c5f3c-79dd-4421-8136-e57adcd9a001'::uuid, 'BM.11.01', NULL, 18, '3118', 'Bề mặt monitor, bơm tiêm điện, máy thở có sạch không?', NULL, NULL, 'none'),
('970bcdb2-e9e1-4ad7-9bb7-ccc8fbe0217b'::uuid, 'BM.11.01', NULL, 19, '3119', 'ĐD có dùng đúng hóa chất (Cồn 70°/chất tương thích) cho thiết bị điện tử?', NULL, NULL, 'none'),
('4f647ffc-f860-4c06-9e38-a97c9ae42d76'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 1, '1601', 'Có biển báo cách ly phù hợp treo bên ngoài cửa phòng', 'TC01', 1, 'fuzzy'),
('ff27e86e-92fd-4710-bc35-4bc7d222685c'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 2, '1602', 'Phòng bệnh bố trí phù hợp (Phòng riêng, ghép nhóm, AIIR...)', 'TC02', 2, 'fuzzy'),
('400b4911-fd8c-4b58-b994-3acff76fc2b7'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 3, '1603', 'Cửa phòng bệnh được giữ đóng (Bắt buộc với giọt bắn/Không khí)', 'TC03', 3, 'uncertain'),
('15a1e721-6a78-45ef-8f02-59e4fead2db6'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 4, '1604', 'Có sẵn PTPH phù hợp (Găng, áo, KT y tế, KT N95) bên ngoài phòng', 'TC04', 4, 'uncertain'),
('18cff3ca-84df-44ee-a29f-3d993e05ffa9'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 5, '1605', 'Có sẵn phương tiện VST (cồn/bồn rửa) tại lối ra/vào', 'TC05', 5, 'uncertain'),
('834dac9b-a48b-4668-b0c9-6e4c657a234a'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 6, '1606', 'Có sẵn thùng/túi chất thải lây nhiễm (vàng) trong phòng', 'TC06', 6, 'fuzzy'),
('e4d65394-4062-44d4-91b3-f1b174f004d5'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 7, '1607', 'Thực hiện VST trước khi vào phòng và sau khi ra khỏi phòng', 'TC07', 7, 'fuzzy'),
('1d139f5a-dcbc-42ad-bc71-496201846429'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 8, '1608', 'Mang ĐÚNG PTPH được yêu cầu trước khi vào phòng', 'TC08', 8, 'uncertain'),
('57040fdd-3124-4e0c-a5b1-4dd686c1b8e6'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 9, '1609', 'Tháo PTPH trước khi ra khỏi phòng (Trừ N95)', 'TC09', 9, 'fuzzy'),
('a926047b-7c57-4e5a-ad5d-1b85ba1f4ecc'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 10, '1610', 'Dụng cụ (ống nghe, HA kế...) được dùng riêng hoặc khử khuẩn', 'TC10', 10, 'fuzzy'),
('bc74a6be-9e52-49da-beaa-b95779a3f8b1'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 11, '1611', '(Nếu là PN không khí) Mang khẩu trang N95, kiểm tra độ khít', 'TC11', 11, 'fuzzy'),
('fd12e53e-0ac9-461b-a59a-da9fe6939a4a'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 12, '1612', 'Người bệnh được hướng dẫn, tuân thủ ở trong phòng', 'TC13', 13, 'fuzzy'),
('913deced-5fb8-4be1-9689-c8f3074cc7eb'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 13, '1613', 'Người nhà/khách thăm được hướng dẫn và tuân thủ (nếu được phép)', 'TC13', 13, 'fuzzy'),
('348338a1-a852-49f9-b69f-ee41374f37c6'::uuid, 'BM.14.01', 'KSNK.QT.14.BM.01', 14, '1614', 'NB được đeo khẩu trang y tế khi vận chuyển (nếu có)', 'TC14', 14, 'fuzzy'),
('0c90e94c-4d43-45be-85d4-cad99a934ecc'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 1, '5901', 'Khu vực thi công được cách ly bằng rào chắn (cứng/mềm) kín hoàn toàn từ sàn đến trần?', NULL, NULL, 'none'),
('23923323-e510-4cfe-bfdf-a7ecfd61a27d'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 2, '5902', 'Các khe hở, cửa sổ, khe thông gió xung quanh công trường đã được niêm phong băng dính kín?', 'TC02', 2, 'uncertain'),
('d9a78d84-cd95-4add-a0a0-f18542246b97'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 3, '5903', 'Đang duy trì ÁP LỰC ÂM liên tục bên trong vùng can thiệp (có máy lọc HEPA hoạt động)?', 'TC05', 5, 'uncertain'),
('d1ab5e7e-18e9-4cc4-b77b-71c098ffac95'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 4, '5904', 'Có sử dụng thảm dính bụi tại lối ra/vào và được thay mới liên tục khi bẩn?', 'TC08', 8, 'uncertain'),
('b4858ef6-1fd2-48de-b73f-96a695284f76'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 5, '5905', 'Đường vận chuyển vật liệu/chất thải xây dựng được tách biệt và xe rác được che phủ kín?', 'TC09', 9, 'uncertain'),
('4b4352f7-5f0e-4288-96a2-7db04b6dc7fa'::uuid, 'BM.03.03', 'KSNK.QT.03.BM.03', 6, '5906', 'Thực hiện vệ sinh khu vực lâm sàng lân cận công trường hàng ngày (lau ẩm, tuyệt đối không quét khô)?', NULL, NULL, 'none'),
('ec185e50-bfa9-4f77-bd54-f3fd4febd5d9'::uuid, 'BM.08.01', 'KSNK.QT.08.BM.01', 1, '1301', 'Loại nguy cơ phơi nhiễm (Tiếp xúc / Giọt bắn / Khí dung)', 'TC03', 3, 'uncertain'),
('f6931256-20ff-4e81-844a-46bd664902f4'::uuid, 'BM.08.01', 'KSNK.QT.08.BM.01', 2, '1302', 'Chọn ĐÚNG/ĐỦ Găng tay y tế (Sạch/Vô khuẩn)', 'TC02', 2, 'uncertain'),
('fa82717e-c594-4403-8819-ff594017dcfa'::uuid, 'BM.08.01', 'KSNK.QT.08.BM.01', 3, '1303', 'Chọn ĐÚNG/ĐỦ Áo choàng bảo hộ', NULL, NULL, 'none'),
('6b2fb4ed-d5ea-48aa-853b-dbccf1bc93f6'::uuid, 'BM.08.01', 'KSNK.QT.08.BM.01', 4, '1304', 'Chọn ĐÚNG/ĐỦ Khẩu trang (Y tế/N95)', 'TC05', 5, 'uncertain'),
('624d1244-5e0c-44ac-aff0-ee814d8c97ba'::uuid, 'BM.08.01', 'KSNK.QT.08.BM.01', 5, '1305', 'Chọn ĐÚNG/ĐỦ Kính bảo hộ/Tấm che mặt', 'TC06', 6, 'fuzzy'),
('3f4e6a71-7f25-41d8-899e-d54870fc2914'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 1, '1501', 'Thực hiện vệ sinh tay trước khi chuẩn bị thuốc/dụng cụ', 'TC03', 3, 'uncertain'),
('f6f8a21e-0162-4bcc-89df-155d321e281f'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 2, '1502', 'Xe tiêm/khay tiêm sạch sẽ, gọn gàng', 'TC01', 1, 'fuzzy'),
('c7ec58e2-a125-4614-af2d-eab3a3d08272'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 3, '1503', 'Sát khuẩn nắp lọ thuốc bằng cồn 70° trước khi rút thuốc', 'TC05', 5, 'fuzzy'),
('93112c7a-1aaa-428a-acc8-052c292d9a87'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 4, '1504', 'Sử dụng 1 bơm tiêm, 1 kim tiêm vô khuẩn cho 1 lần tiêm', 'TC06', 6, 'fuzzy'),
('33ab68fd-2752-4b5b-99c5-7cf7a846f1fb'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 5, '1505', 'Không để kim tiêm cắm lưu trên nắp lọ thuốc đa liều', 'TC06', 6, 'uncertain'),
('9f53308f-bee4-4556-ab43-c59d05d9919e'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 6, '1506', 'Thực hiện vệ sinh tay trước khi tiêm cho người bệnh', 'TC08', 8, 'uncertain'),
('1c60e72a-d28b-4a70-b425-0899fea4d100'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 7, '1507', 'Mang găng tay (nếu có chỉ định)', 'TC08', 8, 'uncertain'),
('13d2e97b-2e9f-46c9-9436-3723604fcbc0'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 8, '1508', 'Sát khuẩn da vùng tiêm đúng kỹ thuật (xoắn ốc) và CHỜ KHÔ', 'TC09', 9, 'fuzzy'),
('bdb57232-5e4e-4772-ba2a-e77de222e6d4'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 9, '1509', 'KHÔNG đậy nắp kim tiêm bằng 2 tay (Cấm kỹ thuật 2 tay)', 'TC11', 11, 'fuzzy'),
('49938766-e092-4f00-b1a8-e1e8c387b5ff'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 10, '1510', 'KHÔNG tháo rời kim tiêm hoặc bẻ cong kim bằng tay', 'TC12', 12, 'fuzzy'),
('a6ce72f6-48e5-4294-9912-25355d381a7a'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 11, '1511', 'Thải bỏ kim và bơm tiêm vào hộp kháng thủng NGAY LẬP TỨC', 'TC11', 11, 'fuzzy'),
('f1cac5f4-50a2-4723-b14d-d3e5e8272331'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 12, '1512', 'Hộp kháng thủng đặt đúng vị trí (trong tầm với, < 1 sải tay)', 'TC02', 2, 'uncertain'),
('d2ae8cf0-ae0d-4c68-bb46-fb5550216b19'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 13, '1513', 'Hộp kháng thủng không bị đầy quá 3/4 vạch', 'TC11', 11, 'uncertain'),
('3ca8df13-c87c-40ed-818a-503ea9d78f9f'::uuid, 'BM.09.01', 'KSNK.QT.09.BM.01', 14, '1514', 'Thực hiện vệ sinh tay sau khi kết thúc thủ thuật (sau tháo găng)', 'TC13', 13, 'fuzzy'),
('593fe960-5bea-442c-a97b-fd9ed3d75856'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 1, '1701', 'Khoa giao đã thông báo/phối hợp với khoa nhận', 'TC01', 1, 'uncertain'),
('3594d1ce-2fa6-4126-ab73-c7fafb80df84'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 2, '1702', 'NB được chuẩn bị đúng (băng kín vết thương, đeo khẩu trang nếu cần)', NULL, NULL, 'none'),
('68cc7aaa-7f70-4d75-9239-8455431f67f1'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 3, '1703', 'Phương tiện vận chuyển (xe/cáng) SẠCH trước khi đón NB', 'TC04', 4, 'fuzzy'),
('4077fcd6-8ea7-411a-ac3d-08d7a66e4347'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 4, '1704', 'NVYT vận chuyển VST và mang PTPH đúng (nếu có chỉ định cách ly)', NULL, NULL, 'none'),
('3abbf66f-74f2-4c14-9881-d7f6e122513e'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 5, '1705', 'NVYT hạn chế chạm tay (đặc biệt là tay có găng) vào môi trường (nút thang máy, cửa)', 'TC07', 7, 'uncertain'),
('b4f0f935-d15e-489e-a74b-08cc65114e78'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 6, '1706', 'Di chuyển theo tuyến đường hợp lý, hạn chế tiếp xúc', NULL, NULL, 'none'),
('4a0af619-485f-4b89-8fc2-51e348c008dc'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 7, '1707', 'NVYT tháo PTPH (nếu có) đúng cách, VST sau khi bàn giao NB', NULL, NULL, 'none'),
('c55cb2a3-687b-44b2-ae82-5bd95c0154f6'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 8, '1708', '(QUAN TRỌNG) Phương tiện (xe/cáng) được lau khử khuẩn các bề mặt tiếp xúc ngay sau khi sử dụng', 'TC09', 9, 'uncertain'),
('83a1b862-efca-4d49-a747-7738dd0afeae'::uuid, 'BM.15.01', 'KSNK.QT.15.BM.01', 9, '1709', 'Phương tiện được cất giữ tại khu vực sạch, gọn gàng', NULL, NULL, 'none'),
('65801a8d-95cd-4c6f-a70d-774e84ab499c'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 1, '1801', 'NVYT (Điều dưỡng) có mang PTPH (găng tay, áo choàng, khẩu trang...) khi xử lý tử thi?', 'TC01', 1, 'fuzzy'),
('01c0e5a3-880d-4c27-a432-2e9bb047b360'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 2, '1802', 'Các ống/dẫn lưu có được tháo gỡ cẩn thận?', NULL, NULL, 'none'),
('8aca82dc-5c4e-46f8-9eb5-7459354057e1'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 3, '1803', 'Máu/dịch tiết có được lau sạch trước khi đóng gói?', 'TC08', 8, 'uncertain'),
('8d1bb5ab-d36a-4921-be97-9c7d28e0228d'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 4, '1804', 'Tử thi có được đặt vào túi đựng tử thi không thấm nước, kéo khóa kín?', 'TC07', 7, 'uncertain'),
('f203aefd-50ad-4c7d-85fd-e3149bd3ee39'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 5, '1805', 'Có dán nhãn nhận dạng bên ngoài túi?', 'TC06', 6, 'uncertain'),
('235c45fe-40d8-439e-819d-cf54dfab67c5'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 6, '1806', 'Nếu có rò rỉ, có sử dụng túi thứ hai (double-bagging)?', NULL, NULL, 'none'),
('b5fb896a-3448-46d9-92b3-04a8402b0d00'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 7, '1807', 'Khu vực giường bệnh có được VSMT sau khi tử thi chuyển đi?', 'TC10', 10, 'uncertain'),
('cc06c0a6-4916-47b3-b2c0-598a3ceaf550'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 8, '1808', 'Nhân viên vận chuyển (Nhà tang lễ) có mang PTPH?', NULL, NULL, 'none'),
('ec879c98-70db-45b1-bea5-3473039eaf6e'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 9, '1809', 'Có sổ bàn giao (BM.16.02) giữa khoa và Nhà tang lễ?', NULL, NULL, 'none'),
('5d795b08-b7fb-4013-b03a-d8d4262fdede'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 10, '1810', 'Tử thi có được vận chuyển bằng xe đẩy chuyên dụng, có che đậy?', 'TC09', 9, 'uncertain'),
('a2252711-2252-4e77-ac59-6639b78c1715'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 11, '1811', 'Xe đẩy tử thi có được vệ sinh, khử khuẩn sau khi sử dụng?', 'TC08', 8, 'uncertain'),
('a8b29871-914f-42d7-a066-abeaedfc49f0'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 12, '1812', 'Tử thi có được bảo quản trong tủ lạnh chuyên dụng?', NULL, NULL, 'none'),
('15929634-1faa-4cdf-bf1f-986409a1f391'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 13, '1813', 'Nhà tang lễ có sạch sẽ, được vệ sinh định kỳ?', NULL, NULL, 'none'),
('293caab1-c8d8-4886-bf04-004fabd60762'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 14, '1814', 'Tử thi bệnh truyền nhiễm nguy hiểm có được dán nhãn cảnh báo?', 'TC12', 12, 'fuzzy'),
('1423d88f-5743-4bab-a33f-a06078992ad2'::uuid, 'BM.16.01', 'KSNK.QT.16.BM.01', 15, '1815', 'Có được đóng gói kép?', NULL, NULL, 'none'),
('5c1d7798-8251-49ea-9a93-d873ebf68d8e'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 1, '1901', 'Tháo bỏ trang sức, đồ dùng cá nhân và Vệ sinh tay', NULL, NULL, 'none'),
('aaaa93a6-d136-4b7c-be11-52f1158b7153'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 2, '1902', 'Kiểm tra bộ PTPH (không rách, đúng kích cỡ)', NULL, NULL, 'none'),
('e6270085-42e9-4d15-9ff1-8093064782eb'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 3, '1903', 'Mặc bộ liền quần. Kéo khóa lên hết mức', 'TC03', 3, 'uncertain'),
('a4f2a247-a184-423d-b9a8-546154217c69'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 4, '1904', 'Mang ủng cao su (cho ống quần vào trong hoặc phủ ngoài tùy loại)', NULL, NULL, 'none'),
('4cbaeb44-96bb-4ac9-9194-85d5de00a11f'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 5, '1905', 'Đeo khẩu trang N95 và kiểm tra độ kín (Fit check)', 'TC05', 5, 'fuzzy'),
('851ab784-72bf-4d7c-938a-1e4775cee193'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 6, '1906', 'Đeo kính bảo hộ kín hoặc tấm che mặt', 'TC06', 6, 'fuzzy'),
('06c130ff-bc5f-4d75-abd5-5811a55df8b1'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 7, '1907', 'Đội mũ trùm đầu/trùm kín cổ (của bộ liền quần)', 'TC06', 6, 'uncertain'),
('293dd103-d9fc-48d4-a132-47e39326ec31'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 8, '1908', 'Mang găng tay y tế (lớp trong) và găng tay cao su dài (lớp ngoài) trùm kín cổ tay áo', 'TC07', 7, 'fuzzy'),
('6a09c1d8-822f-47ba-96e4-45b044d0a7b0'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 9, '1909', 'Vệ sinh tay (trên găng tay ngoài) bằng dung dịch sát khuẩn', NULL, NULL, 'none'),
('29e51d1f-cfb8-4267-882f-0e3ec0424d27'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 10, '1910', 'Tháo găng tay ngoài an toàn và Vệ sinh tay (trên găng tay trong)', 'TC07', 7, 'uncertain'),
('48a2bd35-e005-43a0-82e4-6e678ccc1333'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 11, '1911', 'Cởi bỏ kính/tấm che mặt (cầm từ phía sau) và Vệ sinh tay', 'TC11', 11, 'fuzzy'),
('883442d3-91d6-4581-9bfb-4aa35bda8c9b'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 12, '1912', 'Cởi bỏ bộ liền quần (cuộn lộn trái từ trên xuống dưới) cùng với ủng và Vệ sinh tay', NULL, NULL, 'none'),
('e2dd9814-07ad-4035-8ec8-110305d54698'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 13, '1913', 'Tháo găng tay trong và Vệ sinh tay trực tiếp', NULL, NULL, 'none'),
('63224d62-319c-4db1-9dc7-fedbd4dd8b0a'::uuid, 'BM.17.01', 'KSNK.QT.17.BM.01', 14, '1914', 'Tháo khẩu trang N95 (cầm từ dây đeo phía sau) và Vệ sinh tay lần cuối', 'TC15', 15, 'fuzzy'),
('d511a994-fd57-4612-a050-c50716996067'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 1, '2001', 'Nhân viên mang đầy đủ PTPH (tạp dề, găng cao su dày, kính/mặt nạ, ủng)?', 'TC04', 4, 'fuzzy'),
('a078059d-6b96-4ed8-a526-1c504869a308'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 2, '2002', 'Khu vực rửa sạch sẽ, sắp xếp gọn gàng, áp suất âm?', NULL, NULL, 'none'),
('1587bd39-1596-4066-856b-fceaf2dd5b87'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 3, '2003', 'Dụng cụ được tháo rời tối đa các bộ phận trước khi ngâm?', 'TC05', 5, 'uncertain'),
('a63d4fe9-4409-4f48-8835-d42066ed53ef'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 4, '2004', 'Dung dịch Enzyme pha đúng nồng độ và nhiệt độ nước ấm (30-45°C)?', 'TC06', 6, 'fuzzy'),
('bf853337-0be7-4dff-9b56-1bc7f675a12d'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 5, '2005', 'Dụng cụ được ngâm ngập hoàn toàn (bơm đầy lòng ống)?', 'TC07', 7, 'fuzzy'),
('cfdca568-fbb7-43ba-8ef0-6d192dbffdcb'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 6, '2006', 'Thực hiện cọ rửa dưới mặt nước (không văng bắn)?', 'TC08', 8, 'uncertain'),
('9bce3f11-d629-4cb3-af2c-17f6dec207a7'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 7, '2007', 'Có sử dụng chổi cọ nòng chuyên dụng cho các dụng cụ có lòng ống?', 'TC11', 11, 'uncertain'),
('79323005-c233-4c4d-a087-f7dc30a37380'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 8, '2008', 'Dụng cụ được xả sạch hóa chất dưới vòi nước chảy (nước RO)?', 'TC10', 10, 'fuzzy'),
('8ccdb90f-b0e4-482c-b234-d01dba9323fb'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 9, '2009', 'Dụng cụ được làm khô (khí nén/khăn/tủ sấy) trước khi chuyển đi?', 'TC11', 11, 'uncertain'),
('4cc5f376-a35b-44cc-b155-fd063cfc46a4'::uuid, 'BM.18.02', 'KSNK.QT.18.BM.02', 10, '2010', 'Có thực hiện kiểm tra độ sạch (dưới kính lúp) sau khi rửa?', NULL, NULL, 'none'),
('37c478e6-eb4c-45db-a9eb-1f41687630a4'::uuid, 'BM.19.01', NULL, 1, '2101', 'Nhân viên có mang PTPH đầy đủ (kính/tấm che mặt, găng tay kháng hóa chất, áo chống thấm) khi làm sạch?', NULL, NULL, 'none'),
('1bf7fd7f-8112-4206-9502-39d22bfcad31'::uuid, 'BM.19.01', NULL, 2, '2102', 'Khu vực bẩn và sạch có tách biệt, tuân thủ một chiều?', NULL, NULL, 'none'),
('a94f03fe-07b6-4fb1-b546-758a69bb3fe2'::uuid, 'BM.19.01', NULL, 3, '2103', 'Khu vực ngâm hóa chất KKMĐC có thông khí tốt? Bồn ngâm có nắp đậy?', NULL, NULL, 'none'),
('7585fa46-084f-4619-ba2c-aca3e8ea1a41'::uuid, 'BM.19.01', NULL, 4, '2104', 'Có thực hiện kiểm tra rò rỉ cho mọi ống soi trước khi ngâm?', NULL, NULL, 'none'),
('b61cd4d3-b45f-4d1a-bc5f-38a94ae41859'::uuid, 'BM.19.01', NULL, 5, '2105', 'Hóa chất enzyme (Bồn 1) có được pha và thay đúng quy định?', NULL, NULL, 'none'),
('cba58326-9275-4f50-99f5-8b25084dbc06'::uuid, 'BM.19.01', NULL, 6, '2106', '(Quan trọng): Nhân viên có dùng bàn chải nòng (đúng cỡ) cọ rửa TẤT CẢ các kênh?', NULL, NULL, 'none'),
('134b8dd8-ce0d-49ca-ba40-009bd452718e'::uuid, 'BM.19.01', NULL, 7, '2107', 'Các van, nút có được tháo rời và cọ rửa kỹ?', NULL, NULL, 'none'),
('6988336a-194e-412f-93ea-ef0456570e9d'::uuid, 'BM.19.01', NULL, 8, '2108', 'Dụng cụ có được xả sạch enzyme (Bồn 2) trước khi KKMĐC?', NULL, NULL, 'none'),
('190d022e-c580-4a42-a0c4-e289c30f6f20'::uuid, 'BM.19.01', NULL, 9, '2109', '(Ngâm tay): Có kiểm tra nồng độ (MEC) bằng que thử trước khi ngâm?', NULL, NULL, 'none'),
('f09f4925-1155-4d8d-864a-374de23dcdea'::uuid, 'BM.19.01', NULL, 10, '2110', '(Ngâm tay): Có đảm bảo ngâm ngập và bơm đầy hóa chất vào các kênh?', NULL, NULL, 'none'),
('8238805b-8e87-43a8-91b1-b2fed313ccee'::uuid, 'BM.19.01', NULL, 11, '2111', '(Ngâm tay): Có dùng đồng hồ hẹn giờ và tuân thủ đúng thời gian ngâm?', NULL, NULL, 'none'),
('90d5b6a3-9f3a-4139-8c6b-758cb526d9f5'::uuid, 'BM.19.01', NULL, 12, '2112', '(Chạy máy): Có kết nối đúng các kênh vào máy AER?', NULL, NULL, 'none'),
('87d18fc7-8cae-43c6-a7df-88ba761a3df0'::uuid, 'BM.19.01', NULL, NULL, '2113', 'LÀM KHÔ VÀ LƯU GIỮ', NULL, NULL, 'none'),
('c9b1c33a-dbd4-4c8f-a90b-e54113bacbd0'::uuid, 'BM.19.01', NULL, NULL, '2114', 'LÀM KHÔ VÀ LƯU GIỮ', NULL, NULL, 'none'),
('b7140f57-8094-4e2f-b436-e1a72de3dc25'::uuid, 'BM.19.01', NULL, NULL, '2115', 'LÀM KHÔ VÀ LƯU GIỮ', NULL, NULL, 'none')
ON CONFLICT (old_criterion_id) DO UPDATE SET
  old_noi_dung = EXCLUDED.old_noi_dung,
  new_ma_tc = EXCLUDED.new_ma_tc,
  new_stt = EXCLUDED.new_stt,
  match_confidence = EXCLUDED.match_confidence,
  ma_bk_long = EXCLUDED.ma_bk_long;

-- Resolve new_criterion_id từ danh mục hiện tại (prod đã có 65 KSNK.*).
UPDATE public.gstt_map_tieu_chi_orphan m
SET new_criterion_id = tc.id
FROM public.gstt_dm_bang_kiem bk
JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON tc.bang_kiem_id = bk.id
WHERE m.ma_bk_long IS NOT NULL
  AND bk.ma_bk = m.ma_bk_long
  AND m.new_criterion_id IS NULL
  AND (
    (m.new_ma_tc IS NOT NULL AND upper(coalesce(tc.ma_tc,'')) = upper(m.new_ma_tc))
    OR (m.new_stt IS NOT NULL AND tc.stt = m.new_stt AND m.match_confidence IN ('exact','fuzzy'))
  );

-- Fallback: khớp noi_dung (chuẩn hóa khoảng trắng) trong cùng BK dài.
UPDATE public.gstt_map_tieu_chi_orphan m
SET new_criterion_id = tc.id,
    match_confidence = CASE WHEN m.match_confidence = 'none' THEN 'fuzzy' ELSE m.match_confidence END
FROM public.gstt_dm_bang_kiem bk
JOIN public.gstt_dm_tieu_chi_bang_kiem tc ON tc.bang_kiem_id = bk.id
WHERE m.ma_bk_long IS NOT NULL
  AND bk.ma_bk = m.ma_bk_long
  AND m.new_criterion_id IS NULL
  AND lower(regexp_replace(coalesce(tc.noi_dung,''), '\s+', ' ', 'g'))
    = lower(regexp_replace(m.old_noi_dung, '\s+', ' ', 'g'));

COMMIT;
