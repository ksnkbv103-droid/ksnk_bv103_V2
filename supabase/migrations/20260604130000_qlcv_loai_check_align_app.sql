-- Repair local/linked nếu 20260604120000 đã apply với CHECK cũ (THUONG/DE_XUAT/KHAC).

BEGIN;

ALTER TABLE public.qlcv_fact_cong_viec DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_loai_check;

UPDATE public.qlcv_fact_cong_viec
SET loai_cong_viec = CASE
  WHEN loai_cong_viec IN ('DINH_KY', 'DOT_XUAT', 'KHAN_CAP') THEN loai_cong_viec
  ELSE 'DOT_XUAT'
END;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD CONSTRAINT qlcv_fact_cong_viec_loai_check CHECK (
    loai_cong_viec = ANY (ARRAY['DINH_KY','DOT_XUAT','KHAN_CAP']::text[])
  );

COMMIT;
