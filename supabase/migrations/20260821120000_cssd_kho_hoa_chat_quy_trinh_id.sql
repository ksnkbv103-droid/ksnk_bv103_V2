-- CSSD: gắn phiếu xuất hóa chất với chu trình bộ (nhật ký rửa tại bồn).
-- Additive — không đổi RLS; ghi qua admin client giống su_co_id.

ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS quy_trinh_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_quy_trinh_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_quy_trinh_id_fkey
      FOREIGN KEY (quy_trinh_id) REFERENCES public.cssd_fact_quy_trinh(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_kho_hc_quy_trinh
  ON public.cssd_fact_kho_hoa_chat_giao_dich (quy_trinh_id)
  WHERE quy_trinh_id IS NOT NULL;

COMMENT ON COLUMN public.cssd_fact_kho_hoa_chat_giao_dich.quy_trinh_id IS
  'Chu trình bộ khi xuất hóa chất tại trạm Làm sạch (audit: máy + lô gắn quy_trinh).';
