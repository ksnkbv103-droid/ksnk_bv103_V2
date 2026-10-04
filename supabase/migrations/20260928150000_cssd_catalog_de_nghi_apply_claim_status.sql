-- S-C: CAS claim trước apply đề nghị danh mục (APPLYING / APPLY_FAILED).
-- Không áp dụng tự động — chỉ thêm file; chờ Nghĩa lệnh migrate.

ALTER TABLE public.cssd_catalog_de_nghi
  DROP CONSTRAINT IF EXISTS cssd_catalog_de_nghi_status_check;

ALTER TABLE public.cssd_catalog_de_nghi
  ADD CONSTRAINT cssd_catalog_de_nghi_status_check
  CHECK (status IN ('PENDING', 'APPLYING', 'APPLY_FAILED', 'APPROVED', 'REJECTED'));

COMMENT ON COLUMN public.cssd_catalog_de_nghi.status IS
  'PENDING → APPLYING (claim) → APPROVED | APPLY_FAILED; REJECTED từ PENDING/APPLY_FAILED. Không revert APPLY_FAILED về PENDING.';
