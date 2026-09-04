-- DRAFT / LOCAL FIRST — do NOT require applying to remote yet.
-- BV103 BOM: 1 bộ × 1 loại active = 1 dòng chi tiết.
--
-- Go-live steps (linked / production):
--   1) ADMIN: «Gộp dòng trùng loại» per set (or mergeDuplicateBomLinesAction() for all)
--      until the preview query below returns 0 rows.
--   2) Apply this migration (partial UNIQUE on active rows).
--   3) Create/form/THEM_DONG already coalesce via findActiveBomLine + planAddOntoExistingQty.
--
-- Soft-deleted (is_active=false) and null-loai rows may coexist; unique only covers actives.
--
-- Preview duplicates (read-only check):
-- SELECT bo_dung_cu_id, loai_dung_cu_id, count(*) AS n
-- FROM public.cssd_dm_bo_dung_cu_chi_tiet
-- WHERE is_active IS TRUE AND loai_dung_cu_id IS NOT NULL
-- GROUP BY 1, 2
-- HAVING count(*) > 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.cssd_dm_bo_dung_cu_chi_tiet
    WHERE is_active IS TRUE
      AND loai_dung_cu_id IS NOT NULL
      AND bo_dung_cu_id IS NOT NULL
    GROUP BY bo_dung_cu_id, loai_dung_cu_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'cssd BOM: duplicate active (bo, loai) remain — run ADMIN «Gộp dòng trùng loại» / mergeDuplicateBomLinesAction before creating uq_cssd_bom_chi_tiet_bo_loai_active';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_bom_chi_tiet_bo_loai_active
  ON public.cssd_dm_bo_dung_cu_chi_tiet (bo_dung_cu_id, loai_dung_cu_id)
  WHERE is_active IS TRUE
    AND loai_dung_cu_id IS NOT NULL
    AND bo_dung_cu_id IS NOT NULL;

COMMENT ON INDEX public.uq_cssd_bom_chi_tiet_bo_loai_active IS
  'BV103 2026-09-04: one active BOM line per (bo, loai); so_luong holds the total.';
