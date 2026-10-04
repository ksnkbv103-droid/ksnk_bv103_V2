-- CSSD-04: chuyển dữ liệu MAIN/SUB → parent_bo_id / vai_tro_tach (Lock A).
-- Phụ thuộc mig 20260928065100 (cột parent_bo_id, vai_tro_tach).
-- File-only / chưa apply trừ khi PO ra lệnh migrate.
-- Không drop ma_vai_tro_bo / quy_trinh_cha_id trong lát này (compat đọc).

-- 1) Bộ có mã *-SUB + quy trình SUB → gắn parent_bo_id = bộ MAIN (cùng prefix mã).
UPDATE public.cssd_dm_bo_dung_cu AS sub
SET
  parent_bo_id = main.id,
  vai_tro_tach = 'KHONG_CHIU_NHIET',
  updated_at = now()
FROM public.cssd_dm_bo_dung_cu AS main
WHERE sub.is_active IS TRUE
  AND sub.parent_bo_id IS NULL
  AND upper(sub.ma_bo) LIKE '%-SUB'
  AND upper(main.ma_bo) = regexp_replace(upper(sub.ma_bo), '-SUB$', '')
  AND main.is_active IS TRUE;

-- 2) Ghi chú: bộ MAIN (có con SUB trên quy trình) giữ parent_bo_id NULL (mẹ).
-- App chặn quét mẹ qua hasChildComponents hoặc ma_vai_tro_bo=MAIN.

COMMENT ON COLUMN public.cssd_dm_bo_dung_cu.parent_bo_id IS
  'CSSD-04 Lock A: FK bộ mẹ khi đây là thành phần tách nhiệt. Mẹ = NULL. Backfill từ *-SUB.';
