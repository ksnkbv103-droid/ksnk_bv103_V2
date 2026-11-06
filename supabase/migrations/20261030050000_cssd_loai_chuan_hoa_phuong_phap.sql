-- Chuẩn hóa phương pháp tiệt khuẩn cho danh mục Loại dụng cụ (PO 2026-10-30), theo tên loại, chỉ chạm loại đang ở mặc định.
-- Nguồn: IFU Storz/Wolf/Linvatec/Jarit (ống kính Hopkins: hấp 134 được nhưng hỏng gioăng khi lặp → Plasma/EO), Avantor/NuSil (silicone hấp được), CDC 2008 Table 6.
--   1) Ống kính nội soi quang học + cáp quang/dây nguồn sáng → PLASMA (ưu tiên), EO. Không hấp hơi.
--   2) Silicone (trừ khay/hộp) → STEAM_134 (ưu tiên), PLASMA.
--   3) Dụng cụ kim loại chịu nhiệt (kéo, kẹp, panh, nỉa, dao, banh, kìm, đục, nạo, thìa...) đang chỉ STEAM_134 → STEAM_134 (ưu tiên), PLASMA, EO.
--   Loại còn lại (nhựa, cao su, dây, cáp, điện cực, hộp/khay, tên chưa rõ) GIỮ NGUYÊN — PO duyệt riêng.
-- Trigger trg_cssd_loai_sync_phuong_phap đồng bộ is_chiu_nhiet. CHƯA APPLY PROD.
-- Hoàn tác: không tự động (giá trị cũ: 2291 loại {STEAM_134}, 20 loại {PLASMA}); khôi phục từ backup/CSV trong PR nếu cần.

UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['PLASMA','EO']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'PLASMA'
WHERE ten_loai ~* '^(ống kính|ống nội soi|optic|ống soi|dây cáp quang|cáp quang|dây nguồn sáng)';

UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['STEAM_134','PLASMA']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'STEAM_134'
WHERE ten_loai ~* 'silicon'
  AND ten_loai !~* '^(khay|hộp)'
  AND ten_loai !~* '^(ống kính|ống nội soi|optic|ống soi|dây cáp quang|cáp quang|dây nguồn sáng)';

UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['STEAM_134','PLASMA','EO']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'STEAM_134'
WHERE phuong_phap_cho_phep = ARRAY['STEAM_134']::text[]
  AND ten_loai !~* 'silicon'
  AND ten_loai !~* '(cao su|nhựa|polymer|latex|pvc|dùng một lần|loại dùng 1 lần)'
  AND ten_loai !~* '(điện cực|dây |cáp |bơm|chổi|hộp|khay|đáy|nắp|giá |gạc|túi|vải)'
  AND ten_loai ~* '^(kéo|kẹp|pank|panh|nỉa|dao|cán dao|banh|kìm|đục|nạo|thìa|que |móc|búa|cặp|ruột|dụng cụ|trocar|ống hút|mũi khoan|cưa|dùi|dập|cái |bộ banh|van )';
