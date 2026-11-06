-- Hoàn tác phần khớp nhầm của 20261030050000: «Dụng cụ không tên» là tên chưa rõ, giữ chỉ hấp.
-- CHƯA APPLY PROD — chờ PO.
UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY['STEAM_134'], phuong_phap_tiet_khuan_chi_dinh = 'STEAM_134'
WHERE ten_loai ~* 'không tên'
  AND phuong_phap_cho_phep = ARRAY['STEAM_134','PLASMA','EO'];
