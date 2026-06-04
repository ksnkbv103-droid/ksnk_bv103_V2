-- CSSD: kiểm tra SSOT trạm (cssd_dm_tram + cssd_fact_quy_trinh.tram_hien_tai_id)

SELECT ma_tram, ten_tram, thu_tu, is_active
FROM public.cssd_dm_tram
ORDER BY thu_tu;

SELECT count(*) AS quy_trinh_thieu_tram
FROM public.cssd_fact_quy_trinh
WHERE is_active = true AND tram_hien_tai_id IS NULL;

SELECT q.id, q.ma_qr_quy_trinh, q.tram_hien_tai_id
FROM public.cssd_fact_quy_trinh q
LEFT JOIN public.cssd_dm_tram t ON t.id = q.tram_hien_tai_id
WHERE q.is_active = true AND (q.tram_hien_tai_id IS NULL OR t.id IS NULL);

SELECT ma_qr_quy_trinh, ma_trang_thai_hien_tai, ten_tram_hien_tai, is_dong_bang
FROM public.v_cssd_quy_trinh_full
WHERE is_active = true
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;

SELECT count(*) AS quy_trinh_qua_han_fefo
FROM public.v_cssd_quy_trinh_full
WHERE is_active = true
  AND ngay_het_han IS NOT NULL
  AND ngay_het_han < CURRENT_DATE;
