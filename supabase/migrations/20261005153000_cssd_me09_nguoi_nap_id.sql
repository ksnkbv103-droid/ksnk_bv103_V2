-- ME-09: người nạp mẻ — FK mdm_nhan_su (file-only).
BEGIN;

ALTER TABLE public.cssd_fact_lo_tiet_khuan
  ADD COLUMN IF NOT EXISTS nguoi_nap_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      ADD CONSTRAINT cssd_fact_lo_tiet_khuan_nguoi_nap_id_fkey
      FOREIGN KEY (nguoi_nap_id)
      REFERENCES public.mdm_nhan_su (id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.nguoi_nap_id IS
  'ME-09: nhân sự nạp mẻ (picker danh mục); ghi_chu vẫn giữ bản sao đọc in.';

COMMIT;
