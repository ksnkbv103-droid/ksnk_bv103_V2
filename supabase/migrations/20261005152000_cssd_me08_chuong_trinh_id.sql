-- ME-08 (optional): FK chương trình máy trên mẻ — file-only, chưa bắt buộc app ghi.
BEGIN;

ALTER TABLE public.cssd_fact_lo_tiet_khuan
  ADD COLUMN IF NOT EXISTS chuong_trinh_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_lo_tiet_khuan_chuong_trinh_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_lo_tiet_khuan
      ADD CONSTRAINT cssd_fact_lo_tiet_khuan_chuong_trinh_id_fkey
      FOREIGN KEY (chuong_trinh_id)
      REFERENCES public.cssd_dm_chuong_trinh_may (id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.cssd_fact_lo_tiet_khuan.chuong_trinh_id IS
  'ME-08: liên kết tùy chọn tới cssd_dm_chuong_trinh_may; app vẫn ghi chuong_trinh text.';

COMMIT;
