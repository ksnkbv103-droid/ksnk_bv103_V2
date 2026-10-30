-- Ống hút / hút-tưới / trocar có lòng ống dài hẹp: bỏ PLASMA, giữ {STEAM_134, EO}.
-- Nguồn kho tri thức: Giáo trình HVQY («plasma không áp dụng cho ống dài và hẹp»); Bài 06 CSSD (EO phù hợp lòng ống dài, nhỏ).
-- CHƯA APPLY PROD — chờ PO. Hoàn tác: UPDATE lại mảng thành {STEAM_134,PLASMA,EO} cho đúng các dòng này.
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['STEAM_134','EO'], phuong_phap_tiet_khuan_chi_dinh = 'STEAM_134'
WHERE phuong_phap_cho_phep = ARRAY['STEAM_134','PLASMA','EO']
  AND ten_loai ~* '^(ống hút|trocar|dụng cụ hút)';
