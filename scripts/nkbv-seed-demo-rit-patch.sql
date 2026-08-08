-- Additive demo patch (idempotent): BA-DEMO-03 — mẫu nước tiểu lặp trong cửa sổ RIT.
-- Mục đích: nhìn chip RIT trên UI mà không cần wipe toàn bộ fact NKBV.
-- An toàn: chỉ INSERT khi chưa có ma_xet_nghiem = XN-D03-U2; không đụng BA khác.
-- Prefers local / demo DB. Không chạy ad-hoc trên production shared trừ khi PO chủ động.

BEGIN;

INSERT INTO public.nkbv_fact_vi_sinh (
  ma_benh_nhan, ma_benh_an, ho_ten_benh_nhan, ngay_sinh, gioi_tinh, ngay_vao_vien,
  ngay_lay_mau, khoa_yeu_cau_id, loai_benh_pham, tac_nhan, so_luong,
  ket_qua_duong_tinh, ket_qua_phan_loai, ma_xet_nghiem, is_active, is_mdro, mdro_phenotype, mdro_source, metadata
)
SELECT
  'PID-D03',
  'BA-DEMO-03',
  'Lê Văn Cường',
  '1959-11-20',
  'Nam',
  '2026-07-18 01:00:00+00',
  '2026-07-25 09:00:00+00',
  '8cd1a9bc-7c88-4d68-b70a-ddb6f1381122',
  'Nước tiểu',
  'Escherichia coli',
  '10^5 CFU/ml',
  true,
  'DUONG_TINH',
  'XN-D03-U2',
  true,
  false,
  NULL,
  NULL,
  '{}'::jsonb
WHERE EXISTS (
  SELECT 1 FROM public.nkbv_fact_benh_an WHERE ma_benh_an = 'BA-DEMO-03' AND is_active IS TRUE
)
AND NOT EXISTS (
  SELECT 1 FROM public.nkbv_fact_vi_sinh WHERE ma_xet_nghiem = 'XN-D03-U2'
);

COMMIT;
