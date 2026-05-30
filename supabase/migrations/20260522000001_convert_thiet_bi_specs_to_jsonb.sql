-- Migration: Convert dm_thiet_bi legacy specs (hang_san_xuat, nam_san_xuat, ghi_chu) to Hybrid JSONB specs
-- Date: 22/05/2026

-- 1. Add specs column with default '{}'::jsonb to dm_thiet_bi
ALTER TABLE public.dm_thiet_bi ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2. Migrate historical data to specs JSONB
UPDATE public.dm_thiet_bi
SET specs = jsonb_strip_nulls(jsonb_build_object(
  'hang_san_xuat', hang_san_xuat,
  'nam_san_xuat', nam_san_xuat,
  'ghi_chu', ghi_chu
));

-- 3. Drop dependent view v_dm_thiet_bi_full
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full CASCADE;

-- 4. Drop legacy columns hang_san_xuat, nam_san_xuat, ghi_chu from dm_thiet_bi
ALTER TABLE public.dm_thiet_bi DROP COLUMN IF EXISTS hang_san_xuat;
ALTER TABLE public.dm_thiet_bi DROP COLUMN IF EXISTS nam_san_xuat;
ALTER TABLE public.dm_thiet_bi DROP COLUMN IF EXISTS ghi_chu;

-- 5. Recreate View v_dm_thiet_bi_full extracting fields dynamically from specs JSONB
CREATE OR REPLACE VIEW public.v_dm_thiet_bi_full WITH (security_invoker='true') AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.ma_loai_may,
    lm.ten_loai_may AS ten_loai_may_hien_thi,
    lm.ma_loai_may AS loai_thiet_bi,
    tb.trang_thai,
    tb.specs->>'hang_san_xuat' AS hang_san_xuat,
    (tb.specs->>'nam_san_xuat')::integer AS nam_san_xuat,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    tb.specs->>'ghi_chu' AS ghi_chu,
    tb.specs,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM (public.dm_thiet_bi tb
     LEFT JOIN public.dm_loai_may_tiet_khuan lm ON ((lm.id = tb.loai_may_id)));

-- 6. Add comment on the specs column
COMMENT ON COLUMN public.dm_thiet_bi.specs IS 'Thông số kỹ thuật tùy biến của thiết bị dưới dạng JSONB (hang_san_xuat, nam_san_xuat, ghi_chu, v.v.)';
