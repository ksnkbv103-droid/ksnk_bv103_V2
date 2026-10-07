-- Phiếu đề nghị danh mục: cho phép lô (MIXED) + nhiều dòng trong payload_after.items
ALTER TABLE public.cssd_catalog_de_nghi
  DROP CONSTRAINT IF EXISTS cssd_catalog_de_nghi_target_kind_check;

ALTER TABLE public.cssd_catalog_de_nghi
  ADD CONSTRAINT cssd_catalog_de_nghi_target_kind_check
  CHECK (target_kind IN ('LOAI', 'BO', 'BOM', 'MIXED'));

COMMENT ON COLUMN public.cssd_catalog_de_nghi.payload_after IS
  'Single: field map LOAI/BO hoặc {lines:[...]} BOM. Lô: { items: [{ kind, targetId, targetMa, targetTen, before, after }] }.';
