-- ME-03 · trạng thái CHO_THAM_DINH sau bảo trì từ HOLD_QC
-- File only — CHƯA apply. App ghi trang_thai text; CHECK constraint (nếu có) cần mở rộng.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cssd_dm_thiet_bi_trang_thai_chk'
  ) THEN
    ALTER TABLE public.cssd_dm_thiet_bi DROP CONSTRAINT cssd_dm_thiet_bi_trang_thai_chk;
  END IF;
EXCEPTION WHEN undefined_table OR undefined_object THEN
  NULL;
END $$;

-- Không ép CHECK cứng mọi giá trị — giữ text; comment nghiệp vụ
COMMENT ON COLUMN public.cssd_dm_thiet_bi.trang_thai IS
  'READY|HOAT_DONG|HOLD_QC|CHO_THAM_DINH|REPAIRING|BAO_TRI|BROKEN|RETIRED. ME-03: sau bảo trì từ tạm giữ → CHO_THAM_DINH.';
