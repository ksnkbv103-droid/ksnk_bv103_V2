-- Cột phục vụ nhập liệu legacy (CSV GSVSTTQ): tránh trùng khi chạy lại script, giữ ghi chú gốc.
ALTER TABLE public.fact_giam_sat_vst
  ADD COLUMN IF NOT EXISTS legacy_csv_row_id text,
  ADD COLUMN IF NOT EXISTS ghi_chu text;

COMMENT ON COLUMN public.fact_giam_sat_vst.legacy_csv_row_id IS 'Khóa ID dòng file CSV import (vd. GSVSTTQ) — idempotent import.';
COMMENT ON COLUMN public.fact_giam_sat_vst.ghi_chu IS 'Ghi chú phiếu quan sát (legacy / nhập tay).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_giam_sat_vst_legacy_csv_row_id
  ON public.fact_giam_sat_vst (legacy_csv_row_id)
  WHERE legacy_csv_row_id IS NOT NULL;
