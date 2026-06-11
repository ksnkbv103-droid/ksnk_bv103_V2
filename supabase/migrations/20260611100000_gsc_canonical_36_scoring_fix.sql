-- Audit canonical-36: sửa cach_tinh_diem lệch domain (COMPLIANCE audit → TY_LE, không PASS_FAIL).
-- BM.10.01 (phơi nhiễm), BM.QĐ.19.03 (SUDs) — multi-criteria tuân thủ %.

BEGIN;

UPDATE public.gstt_dm_bang_kiem
SET cach_tinh_diem = 'TY_LE', updated_at = now()
WHERE ma_bk IN ('BM.10.01', 'BM.QĐ.19.03')
  AND cach_tinh_diem IS DISTINCT FROM 'TY_LE';

COMMIT;
