-- Sửa CHECK dấu số lượng kho dụng cụ: cho phép «Nhập kho mới».
-- CHƯA APPLY PROD — chờ PO.
--
-- Lý do: CHECK `cssd_fact_kho_giao_dich_dau_so_luong_check` (20261012163313) bắt NHAP_KHO luôn < 0
-- (trả từ bộ về kho). Nhưng receiveNewInstrumentsAction (cssd-lifecycle.actions.ts) ghi NHAP_KHO +qty
-- với bo_dung_cu_id NULL (nhập dụng cụ mới vào kho) → "violates check constraint".
-- Ảnh hưởng: NHAP_KHO gắn bộ vẫn phải < 0; NHAP_KHO không gắn bộ (nhập mới) phải > 0. Loại khác giữ nguyên.
-- Vẫn NOT VALID: không quét dữ liệu cũ, chỉ áp dòng mới.
-- Hoàn tác: DROP CONSTRAINT rồi ADD lại CHECK cũ từ 20261012163313:
--   CHECK (loai_giao_dich = 'DIEU_CHUYEN'
--     OR (loai_giao_dich = 'BO_SUNG' AND so_luong_thay_doi > 0)
--     OR (loai_giao_dich IN ('BAO_HONG','BAO_MAT','NHAP_KHO') AND so_luong_thay_doi < 0)) NOT VALID;

BEGIN;

ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS cssd_fact_kho_giao_dich_dau_so_luong_check;
ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT cssd_fact_kho_giao_dich_dau_so_luong_check
  CHECK (
    loai_giao_dich = 'DIEU_CHUYEN'
    OR (loai_giao_dich = 'BO_SUNG' AND so_luong_thay_doi > 0)
    OR (loai_giao_dich IN ('BAO_HONG', 'BAO_MAT') AND so_luong_thay_doi < 0)
    OR (loai_giao_dich = 'NHAP_KHO' AND (
          (bo_dung_cu_id IS NOT NULL AND so_luong_thay_doi < 0)
       OR (bo_dung_cu_id IS NULL AND so_luong_thay_doi > 0)
    ))
  ) NOT VALID;

COMMIT;

-- CHƯA APPLY PROD — chờ PO. Kiểm prod (chỉ đọc):
--   SELECT convalidated, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'cssd_fact_kho_giao_dich_dau_so_luong_check';
--   SELECT version FROM supabase_migrations.schema_migrations WHERE version = '20261110130000';
