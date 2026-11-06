-- PO 2026-10-30: ống kính/cáp quang cho phép hấp 134 khi hãng (IFU) cho phép, vẫn ưu tiên PLASMA, rồi EO.
-- Chỉ chạm loại đang đúng {PLASMA,EO} (do migration 20261030050000). Trigger đồng bộ is_chiu_nhiet.
-- CHƯA APPLY PROD.
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['PLASMA','EO','STEAM_134']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'PLASMA'
WHERE phuong_phap_cho_phep = ARRAY['PLASMA','EO']::text[]
  AND ten_loai ~* '^(ống kính|ống nội soi|optic|ống soi|dây cáp quang|cáp quang|dây nguồn sáng)';
