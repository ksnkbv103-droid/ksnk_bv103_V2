-- Kho hóa chất: liên kết giao dịch xuất/điều chỉnh với sự cố CHEMICAL (Slice H-C)

ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
  ADD COLUMN IF NOT EXISTS su_co_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_fact_kho_hc_su_co_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_fact_kho_hoa_chat_giao_dich
      ADD CONSTRAINT cssd_fact_kho_hc_su_co_id_fkey
      FOREIGN KEY (su_co_id) REFERENCES public.cssd_fact_su_co(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_kho_hc_su_co ON public.cssd_fact_kho_hoa_chat_giao_dich (su_co_id)
  WHERE su_co_id IS NOT NULL;
