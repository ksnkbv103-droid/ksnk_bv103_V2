-- PO 2026-11-10: các loại ống kính/optic để ở hình thức KHÔNG chịu nhiệt (chỉ PLASMA, EO).
-- Đảo lại phần ống kính của 20261030080000 (cho phép hấp 134). Chỉ chạm loại đang đúng {PLASMA,EO,STEAM_134}
-- do migration đó tạo ra. Cáp quang / dây nguồn sáng giữ nguyên (PO chưa nói).
-- Trigger fn_cssd_loai_sync_phuong_phap tự đặt is_chiu_nhiet=false và phương pháp ưu tiên PLASMA.
-- Sau migration: chạy tách bộ (applyHeatSplitForAllLowHeatLoai) để bộ chứa loại này có -KCN.
-- CHƯA APPLY PROD (cổng PO).
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['PLASMA','EO']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'PLASMA'
WHERE phuong_phap_cho_phep = ARRAY['PLASMA','EO','STEAM_134']::text[]
  AND ten_loai ~* '^(ống kính|optic)';

-- PO 2026-11-10 (bổ sung): cáp quang, dây nguồn sáng, ống soi/ống nội soi HD cũng không chịu nhiệt.
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['PLASMA','EO']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'PLASMA'
WHERE phuong_phap_cho_phep = ARRAY['PLASMA','EO','STEAM_134']::text[]
  AND ten_loai ~* '^(dây cáp quang|dây nguồn sáng|ống soi|ống nội soi hd)';

-- PO 2026-11-10: dụng cụ kim loại / dụng cụ nội soi khác phải chịu nhiệt (vẫn cho Plasma/EO).
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['STEAM_134','PLASMA','EO']::text[],
    phuong_phap_tiet_khuan_chi_dinh = 'STEAM_134'
WHERE is_active AND NOT is_chiu_nhiet
  AND ten_loai ~* '^(khay lưới bảo quản ống nội soi|stapler 12)';
