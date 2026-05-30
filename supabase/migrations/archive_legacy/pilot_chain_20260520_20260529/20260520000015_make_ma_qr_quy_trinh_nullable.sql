-- Migration: Make ma_qr_quy_trinh nullable in fact_su_co to support equipment and chemical incidents
-- Date: 21/05/2026

ALTER TABLE public.fact_su_co ALTER COLUMN ma_qr_quy_trinh DROP NOT NULL;

COMMENT ON COLUMN public.fact_su_co.ma_qr_quy_trinh IS 'Mã QR của quy trình bộ dụng cụ. Nullable khi báo cáo sự cố máy móc hoặc hóa chất chung.';
