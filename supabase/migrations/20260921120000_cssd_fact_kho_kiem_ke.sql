-- CSSD: cho phép ledger kiểm kê (PO P0A 2026-09-21)
-- Trước: NHAP_KHO | BAO_HONG | BAO_MAT | BO_SUNG | DIEU_CHUYEN
-- Sau: + KIEM_KE (tab /cssd-dung-cu?tab=KIEM_KE)

ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS fact_kho_dung_cu_giao_dich_loai_giao_dich_check;

ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT fact_kho_dung_cu_giao_dich_loai_giao_dich_check
  CHECK (loai_giao_dich = ANY (ARRAY[
    'NHAP_KHO'::text,
    'BAO_HONG'::text,
    'BAO_MAT'::text,
    'BO_SUNG'::text,
    'DIEU_CHUYEN'::text,
    'KIEM_KE'::text
  ]));
