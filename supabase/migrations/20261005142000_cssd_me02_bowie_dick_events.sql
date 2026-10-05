-- ME-02 · Bảng sự kiện Bowie-Dick (BM.03) + backfill từ specs
-- File only — CHƯA apply. App vẫn ghi specs; insert sự kiện bỏ qua nếu bảng chưa có.

CREATE TABLE IF NOT EXISTS public.cssd_fact_bowie_dick (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thiet_bi_id uuid NOT NULL REFERENCES public.cssd_dm_thiet_bi(id),
  ngay_ymd date NOT NULL,
  ket_qua text NOT NULL CHECK (ket_qua IN ('DAT', 'KHONG_DAT')),
  nguoi_id uuid NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  ghi_chu text NULL,
  bao_tri_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cssd_fact_bowie_dick_may_ngay
  ON public.cssd_fact_bowie_dick (thiet_bi_id, ngay_ymd DESC, recorded_at DESC);

COMMENT ON TABLE public.cssd_fact_bowie_dick IS
  'ME-02: lịch sử BD đầu ngày (không ghi đè). specs.bd_dau_ngay_* vẫn là snapshot ngày hiện tại.';

-- Backfill 1 dòng từ specs hiện có
INSERT INTO public.cssd_fact_bowie_dick (thiet_bi_id, ngay_ymd, ket_qua, nguoi_id, recorded_at)
SELECT
  t.id,
  (t.specs->>'bd_dau_ngay_ymd')::date,
  upper(t.specs->>'bd_dau_ngay_ket_qua'),
  NULLIF(t.specs->>'bd_dau_ngay_nguoi_id', '')::uuid,
  coalesce((t.specs->>'bd_dau_ngay_at')::timestamptz, now())
FROM public.cssd_dm_thiet_bi t
WHERE t.specs ? 'bd_dau_ngay_ymd'
  AND t.specs->>'bd_dau_ngay_ket_qua' IN ('DAT', 'KHONG_DAT')
  AND (t.specs->>'bd_dau_ngay_ymd') ~ '^\d{4}-\d{2}-\d{2}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.cssd_fact_bowie_dick e
    WHERE e.thiet_bi_id = t.id
      AND e.ngay_ymd = (t.specs->>'bd_dau_ngay_ymd')::date
      AND e.ket_qua = upper(t.specs->>'bd_dau_ngay_ket_qua')
  );

ALTER TABLE public.cssd_fact_bowie_dick ENABLE ROW LEVEL SECURITY;
