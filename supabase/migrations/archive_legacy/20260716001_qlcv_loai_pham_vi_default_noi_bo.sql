-- QLCV: DB còn cột `loai_pham_vi` NOT NULL nhưng app không gửi → lỗi insert.
-- Đặt DEFAULT 'NOI_BO' khi cột còn tồn tại (idempotent; không ảnh hưởng DB đã apply 20260715001 drop cột).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fact_cong_viec'
      AND column_name = 'loai_pham_vi'
  ) THEN
    UPDATE public.fact_cong_viec
    SET loai_pham_vi = 'NOI_BO'
    WHERE loai_pham_vi IS NULL;

    ALTER TABLE public.fact_cong_viec
      ALTER COLUMN loai_pham_vi SET DEFAULT 'NOI_BO';
  END IF;
END $$;
