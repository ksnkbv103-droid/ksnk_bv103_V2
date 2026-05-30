-- Migration: Convert dm_hoa_chat legacy specs (quy_cach, nong_do, ghi_chu) to Hybrid JSONB specs
-- Date: 22/05/2026

-- 1. Add specs column with default '{}'::jsonb to dm_hoa_chat
ALTER TABLE public.dm_hoa_chat ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2. Migrate historical data to specs JSONB
UPDATE public.dm_hoa_chat
SET specs = jsonb_strip_nulls(jsonb_build_object(
  'quy_cach', quy_cach,
  'nong_do', nong_do,
  'ghi_chu', ghi_chu
));

-- 3. Drop legacy columns quy_cach, nong_do, ghi_chu from dm_hoa_chat
ALTER TABLE public.dm_hoa_chat DROP COLUMN IF EXISTS quy_cach;
ALTER TABLE public.dm_hoa_chat DROP COLUMN IF EXISTS nong_do;
ALTER TABLE public.dm_hoa_chat DROP COLUMN IF EXISTS ghi_chu;

-- 4. Create View v_dm_hoa_chat_full extracting fields dynamically from specs JSONB
CREATE OR REPLACE VIEW public.v_dm_hoa_chat_full WITH (security_invoker='true') AS
 SELECT 
    id,
    ma_hoa_chat,
    ten_hoa_chat,
    loai_hoa_chat,
    don_vi_tinh,
    specs->>'quy_cach' AS quy_cach,
    specs->>'nong_do' AS nong_do,
    han_su_dung,
    specs->>'ghi_chu' AS ghi_chu,
    nguong_ton_toi_thieu,
    is_active,
    created_at,
    updated_at,
    specs
   FROM public.dm_hoa_chat;

-- 5. Add comment on the specs column
COMMENT ON COLUMN public.dm_hoa_chat.specs IS 'Thông số kỹ thuật tùy biến của hóa chất dưới dạng JSONB (quy_cach, nong_do, ghi_chu, v.v.)';
