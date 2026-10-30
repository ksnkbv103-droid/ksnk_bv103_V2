-- Loại dụng cụ: nhiều phương pháp tiệt khuẩn được phép (nhiệt cao = STEAM_*, nhiệt thấp = PLASMA/EO).
-- Additive. phuong_phap_tiet_khuan_chi_dinh giữ vai trò «phương pháp ưu tiên» (phần tử đầu / mặc định).
-- is_chiu_nhiet được đồng bộ: true khi mảng cho phép có ít nhất một phương pháp hơi nước.
-- CHƯA APPLY PROD — chờ PO. Hoàn tác: DROP TRIGGER trg_cssd_loai_sync_phuong_phap; DROP COLUMN phuong_phap_cho_phep.

ALTER TABLE public.cssd_dm_loai_dung_cu
  ADD COLUMN IF NOT EXISTS phuong_phap_cho_phep text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.cssd_dm_loai_dung_cu
SET phuong_phap_cho_phep = ARRAY[phuong_phap_tiet_khuan_chi_dinh]
WHERE cardinality(phuong_phap_cho_phep) = 0
  AND phuong_phap_tiet_khuan_chi_dinh IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_dm_loai_dung_cu_pp_cho_phep_check'
  ) THEN
    ALTER TABLE public.cssd_dm_loai_dung_cu
      ADD CONSTRAINT cssd_dm_loai_dung_cu_pp_cho_phep_check
      CHECK (phuong_phap_cho_phep <@ ARRAY['STEAM_134','STEAM_121','PLASMA','EO']::text[]);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_cssd_loai_sync_phuong_phap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Chưa khai mảng: suy từ phương pháp ưu tiên (tương thích form cũ / import).
  IF cardinality(NEW.phuong_phap_cho_phep) = 0 AND NEW.phuong_phap_tiet_khuan_chi_dinh IS NOT NULL THEN
    NEW.phuong_phap_cho_phep := ARRAY[NEW.phuong_phap_tiet_khuan_chi_dinh];
  END IF;
  IF cardinality(NEW.phuong_phap_cho_phep) = 0 THEN
    RAISE EXCEPTION 'Loại dụng cụ phải có ít nhất một phương pháp tiệt khuẩn được phép.';
  END IF;
  -- Phương pháp ưu tiên phải nằm trong mảng cho phép.
  IF NEW.phuong_phap_tiet_khuan_chi_dinh IS NULL
     OR NOT (NEW.phuong_phap_tiet_khuan_chi_dinh = ANY (NEW.phuong_phap_cho_phep)) THEN
    NEW.phuong_phap_tiet_khuan_chi_dinh := NEW.phuong_phap_cho_phep[1];
  END IF;
  NEW.is_chiu_nhiet := (NEW.phuong_phap_cho_phep && ARRAY['STEAM_134','STEAM_121']::text[]);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cssd_loai_sync_phuong_phap ON public.cssd_dm_loai_dung_cu;
CREATE TRIGGER trg_cssd_loai_sync_phuong_phap
  BEFORE INSERT OR UPDATE ON public.cssd_dm_loai_dung_cu
  FOR EACH ROW EXECUTE FUNCTION public.fn_cssd_loai_sync_phuong_phap();

COMMENT ON COLUMN public.cssd_dm_loai_dung_cu.phuong_phap_cho_phep IS
  'Các phương pháp tiệt khuẩn được phép: STEAM_134, STEAM_121 (nhiệt cao), PLASMA, EO (nhiệt thấp). Chọn nhiều.';
