-- Migration: Slice 6 (giam-sat-tuan-thu reform v4) — Seed 3 pilot templates JCI 8.0.
-- Date: 27/05/2026
--
-- 3 templates pilot phủ đủ 3 cách tính điểm + 3 đối tượng giám sát khác nhau
-- để smoke-test toàn bộ engine + UI Slice 5:
--
--   BM.07.01 — Vệ sinh tay 5 thời điểm WHO  (TY_LE / NHAN_VIEN, PHONG_NGUA_CHUAN)
--   BM.27.01 — Care Bundle CAUTI            (TRON_GOI / NGUOI_BENH, GOI_CAN_THIEP)
--   BM.22.04 — QC Mẻ Tiệt khuẩn            (DAT_KHONG_DAT / ME_TIET_KHUAN, XU_LY_DUNG_CU)
--
-- Idempotent: UPSERT theo `ma_bk`. Tieu_chi_jsonb giữ trace `ma_csv_goc` để mai
-- import từ CSV gốc tài liệu sẽ merge được.

-- ----------------------------------------------------
-- Helper: hàm gen_random_uuid() đã có sẵn (extension pgcrypto đã bật).
-- ----------------------------------------------------

-- ====================================================
-- 1. BM.07.01 — Vệ sinh tay 5 thời điểm WHO
-- ====================================================
INSERT INTO public.gstt_dm_bang_kiem
  (ma_bk, ten_bang_kiem, mo_ta, nhom_chuyen_de, loai_hinh_giam_sat, is_active, is_system,
   phan_loai_chuyen_mon, loai_giam_sat, doi_tuong_giam_sat, cach_tinh_diem, phien_ban,
   tieu_chi_jsonb)
VALUES (
  'BM.07.01',
  'Tuân thủ vệ sinh tay theo 5 thời điểm WHO',
  'Bảng kiểm pilot Slice 6 (reform v4 / JCI 8.0). Quan sát hành vi NVYT theo 5 thời điểm rửa tay của WHO.',
  'Vệ sinh tay',
  'TRUC_TIEP',
  true, true,
  'PHONG_NGUA_CHUAN',
  'TUAN_THU',
  'NHAN_VIEN',
  'TY_LE',
  '1.0',
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM0701-T1', 'stt', 1,
      'noi_dung', 'T1: Trước khi tiếp xúc người bệnh',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'WHO 5 Moments',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', false,
      'cho_phep_kpa', false,
      'ma_csv_goc', '1001'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM0701-T2', 'stt', 2,
      'noi_dung', 'T2: Trước khi làm thủ thuật vô khuẩn',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'WHO 5 Moments',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', false,
      'cho_phep_kpa', false,
      'ma_csv_goc', '1002'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM0701-T3', 'stt', 3,
      'noi_dung', 'T3: Sau khi tiếp xúc với máu/dịch tiết người bệnh',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'WHO 5 Moments',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', false,
      'cho_phep_kpa', false,
      'ma_csv_goc', '1003'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM0701-T4', 'stt', 4,
      'noi_dung', 'T4: Sau khi tiếp xúc người bệnh',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'WHO 5 Moments',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', false,
      'cho_phep_kpa', false,
      'ma_csv_goc', '1004'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM0701-T5', 'stt', 5,
      'noi_dung', 'T5: Sau khi tiếp xúc với môi trường xung quanh người bệnh',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'WHO 5 Moments',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', false,
      'cho_phep_kpa', false,
      'ma_csv_goc', '1005'
    )
  )
)
ON CONFLICT (ma_bk) DO UPDATE SET
  ten_bang_kiem        = EXCLUDED.ten_bang_kiem,
  mo_ta                = EXCLUDED.mo_ta,
  phan_loai_chuyen_mon = EXCLUDED.phan_loai_chuyen_mon,
  loai_giam_sat        = EXCLUDED.loai_giam_sat,
  doi_tuong_giam_sat   = EXCLUDED.doi_tuong_giam_sat,
  cach_tinh_diem       = EXCLUDED.cach_tinh_diem,
  phien_ban            = EXCLUDED.phien_ban,
  is_active            = true,
  is_system            = true,
  -- Chỉ ghi đè tieu_chi_jsonb khi row hiện tại chưa có metadata mới (giữ data
  -- thực tế nếu admin đã chỉnh sửa trên prod sau seed).
  tieu_chi_jsonb       = CASE
    WHEN public.gstt_dm_bang_kiem.cach_tinh_diem IS NULL THEN EXCLUDED.tieu_chi_jsonb
    ELSE public.gstt_dm_bang_kiem.tieu_chi_jsonb
  END,
  updated_at           = now();

-- ====================================================
-- 2. BM.27.01 — Care Bundle phòng ngừa CAUTI (catheter UTI)
--    All-or-None: failure trên 1 then chốt = bundle FAIL
-- ====================================================
INSERT INTO public.gstt_dm_bang_kiem
  (ma_bk, ten_bang_kiem, mo_ta, nhom_chuyen_de, loai_hinh_giam_sat, is_active, is_system,
   phan_loai_chuyen_mon, loai_giam_sat, doi_tuong_giam_sat, cach_tinh_diem, phien_ban,
   tieu_chi_jsonb)
VALUES (
  'BM.27.01',
  'Gói can thiệp phòng ngừa nhiễm khuẩn niệu liên quan đặt thông tiểu (CAUTI Bundle)',
  'Bảng kiểm pilot Slice 6 (reform v4). Đánh giá trọn gói chăm sóc CAUTI theo nguyên tắc All-or-None — chỉ cần 1 tiêu chí then chốt fail là cả bundle fail.',
  'Gói can thiệp KSNK',
  'TRUC_TIEP',
  true, true,
  'GOI_CAN_THIEP',
  'TUAN_THU',
  'NGUOI_BENH',
  'TRON_GOI',
  '1.0',
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-01', 'stt', 1,
      'noi_dung', 'Đặt thông tiểu chỉ khi có chỉ định lâm sàng rõ ràng',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Đánh giá chỉ định',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2701'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-02', 'stt', 2,
      'noi_dung', 'Vệ sinh tay đầy đủ trước khi đặt và mỗi lần thao tác',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Kỹ thuật vô khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2702'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-03', 'stt', 3,
      'noi_dung', 'Đặt sonde bằng kỹ thuật vô khuẩn (găng, drape, dung dịch sát khuẩn)',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Kỹ thuật vô khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2703'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-04', 'stt', 4,
      'noi_dung', 'Cố định sonde đúng vị trí — tránh kéo căng / di lệch',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Duy trì vô khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2704'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-05', 'stt', 5,
      'noi_dung', 'Túi đựng nước tiểu thấp hơn bàng quang, không chạm sàn, có van 1 chiều',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Duy trì vô khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2705'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2701-06', 'stt', 6,
      'noi_dung', 'Đánh giá chỉ định mỗi ngày — rút sonde khi không còn cần',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Đánh giá hằng ngày',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '2706'
    )
  )
)
ON CONFLICT (ma_bk) DO UPDATE SET
  ten_bang_kiem        = EXCLUDED.ten_bang_kiem,
  mo_ta                = EXCLUDED.mo_ta,
  phan_loai_chuyen_mon = EXCLUDED.phan_loai_chuyen_mon,
  loai_giam_sat        = EXCLUDED.loai_giam_sat,
  doi_tuong_giam_sat   = EXCLUDED.doi_tuong_giam_sat,
  cach_tinh_diem       = EXCLUDED.cach_tinh_diem,
  phien_ban            = EXCLUDED.phien_ban,
  is_active            = true,
  is_system            = true,
  tieu_chi_jsonb       = CASE
    WHEN public.gstt_dm_bang_kiem.cach_tinh_diem IS NULL THEN EXCLUDED.tieu_chi_jsonb
    ELSE public.gstt_dm_bang_kiem.tieu_chi_jsonb
  END,
  updated_at           = now();

-- ====================================================
-- 3. BM.22.04 — QC Mẻ Tiệt khuẩn
--    PASS_FAIL: cần BI âm + BD/Helix đạt + thông số chu trình đạt
-- ====================================================
INSERT INTO public.gstt_dm_bang_kiem
  (ma_bk, ten_bang_kiem, mo_ta, nhom_chuyen_de, loai_hinh_giam_sat, is_active, is_system,
   phan_loai_chuyen_mon, loai_giam_sat, doi_tuong_giam_sat, cach_tinh_diem, phien_ban,
   tieu_chi_jsonb)
VALUES (
  'BM.22.04',
  'Kiểm soát chất lượng mẻ tiệt khuẩn (QC Mẻ TK)',
  'Bảng kiểm pilot Slice 6 (reform v4). Đánh giá Đạt/Không đạt cho từng mẻ tiệt khuẩn — fail 1 tiêu chí = mẻ phải cách ly recall.',
  'Xử lý dụng cụ',
  'TRUC_TIEP',
  true, true,
  'XU_LY_DUNG_CU',
  'TUAN_THU',
  'ME_TIET_KHUAN',
  'DAT_KHONG_DAT',
  '1.0',
  jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2204-01', 'stt', 1,
      'noi_dung', 'Test Bowie-Dick (BD) hoặc Helix đạt yêu cầu (loại bỏ khí, hơi nước thấm đều)',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Test thường quy đầu ngày',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '6001'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2204-02', 'stt', 2,
      'noi_dung', 'Chỉ thị sinh học (Biological Indicator - BI) ÂM tính sau ủ',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Chứng cứ tiệt khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '6002'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2204-03', 'stt', 3,
      'noi_dung', 'Chỉ thị hóa học loại 5/6 (CI) đổi màu đạt chuẩn ở mỗi gói',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Chứng cứ tiệt khuẩn',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '6003'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2204-04', 'stt', 4,
      'noi_dung', 'Nhiệt độ chu trình đạt 134°C (±1°C) trong tối thiểu 4 phút',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Thông số chu trình',
      'kieu_du_lieu', 'SO_LIEU',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '6004'
    ),
    jsonb_build_object(
      'id', gen_random_uuid(), 'ma_tc', 'BM2204-05', 'stt', 5,
      'noi_dung', 'Bao bì sau tiệt khuẩn nguyên vẹn, khô, không thấm dịch',
      'is_active', true, 'diem_toi_da', 1,
      'phan_muc', 'Bao bì sau TK',
      'kieu_du_lieu', 'BOOLEAN',
      'la_then_chot', true,
      'cho_phep_kpa', false,
      'ma_csv_goc', '6005'
    )
  )
)
ON CONFLICT (ma_bk) DO UPDATE SET
  ten_bang_kiem        = EXCLUDED.ten_bang_kiem,
  mo_ta                = EXCLUDED.mo_ta,
  phan_loai_chuyen_mon = EXCLUDED.phan_loai_chuyen_mon,
  loai_giam_sat        = EXCLUDED.loai_giam_sat,
  doi_tuong_giam_sat   = EXCLUDED.doi_tuong_giam_sat,
  cach_tinh_diem       = EXCLUDED.cach_tinh_diem,
  phien_ban            = EXCLUDED.phien_ban,
  is_active            = true,
  is_system            = true,
  tieu_chi_jsonb       = CASE
    WHEN public.gstt_dm_bang_kiem.cach_tinh_diem IS NULL THEN EXCLUDED.tieu_chi_jsonb
    ELSE public.gstt_dm_bang_kiem.tieu_chi_jsonb
  END,
  updated_at           = now();

-- ----------------------------------------------------
-- Sanity check
-- ----------------------------------------------------
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM public.gstt_dm_bang_kiem
   WHERE ma_bk IN ('BM.07.01', 'BM.27.01', 'BM.22.04')
     AND cach_tinh_diem IS NOT NULL;
  RAISE NOTICE '[gstt_seed_pilot_3_templates] % / 3 templates seeded with cach_tinh_diem.', v_count;
END $$;
