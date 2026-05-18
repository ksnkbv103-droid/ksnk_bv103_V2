-- CSSD: kiểm tra SSOT trạm (dm_tram_cssd + fact_quy_trinh.tram_hien_tai_id)
-- Chạy sau migration 20260716014_cssd_tram_fk_ssot.sql

-- 1) Danh mục trạm (kỳ vọng 6 mã)
SELECT ma_tram, ten_tram, thu_tu, is_active
FROM public.dm_tram_cssd
ORDER BY thu_tu;

-- 2) Quy trình mở thiếu FK trạm
SELECT count(*) AS quy_trinh_thieu_tram
FROM public.fact_quy_trinh
WHERE is_active = true
  AND tram_hien_tai_id IS NULL;

-- 3) FK trỏ tới trạm không active / không tồn tại
SELECT q.id, q.ma_qr_quy_trinh, q.tram_hien_tai_id
FROM public.fact_quy_trinh q
LEFT JOIN public.dm_tram_cssd t ON t.id = q.tram_hien_tai_id
WHERE q.is_active = true
  AND (q.tram_hien_tai_id IS NULL OR t.id IS NULL);

-- 4) View đọc — mẫu 20 dòng
SELECT ma_qr_quy_trinh, ma_trang_thai_hien_tai, ten_tram_hien_tai, is_dong_bang
FROM public.v_fact_quy_trinh_full
WHERE is_active = true
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;

-- 5) Quá hạn FEFO (mở, có hạn)
SELECT count(*) AS quy_trinh_qua_han_fefo
FROM public.v_fact_quy_trinh_full
WHERE is_active = true
  AND ngay_het_han IS NOT NULL
  AND ngay_het_han < CURRENT_DATE;
