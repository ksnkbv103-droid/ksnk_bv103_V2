-- Khóa PO 2026-11-01 (giám sát VST/GSC): <85 đỏ · 85–<90 vàng · ≥90 xanh; cỡ mẫu tối thiểu 50 theo khoa/kỳ.
-- Chỉ THÊM dòng hiệu lực từ 2026-11-01 vào ksnk_dm_tham_so (không UPDATE/DELETE dòng 2026-01-01 → giữ lịch sử).
-- Mã mới giam_sat.xanh_tu_pct = mốc xanh (90). Số mặc định trong supervision-thresholds.ts = giá trị mới nhất ở đây.
INSERT INTO public.ksnk_dm_tham_so (ma_tham_so, gia_tri, hieu_luc_tu, nguon) VALUES
  ('giam_sat.xanh_tu_pct', 90, '2026-11-01', 'khóa PO 2026-11-01: xanh từ 90'),
  ('giam_sat.vang_min_pct', 85, '2026-11-01', 'khóa PO 2026-11-01: đỏ dưới 85'),
  ('giam_sat.khoa_canh_bao_pct', 85, '2026-11-01', 'khóa PO 2026-11-01: tô cảnh báo khoa dưới 85'),
  ('vst.so_sanh_mau_toi_thieu', 50, '2026-11-01', 'khóa PO 2026-11-01: mẫu tối thiểu 50'),
  ('doi_soat.vst_mau_toi_thieu', 50, '2026-11-01', 'khóa PO 2026-11-01: mẫu tối thiểu 50'),
  ('doi_soat.gsc_mau_toi_thieu', 50, '2026-11-01', 'khóa PO 2026-11-01: mẫu tối thiểu 50')
ON CONFLICT (ma_tham_so, hieu_luc_tu) DO NOTHING;
