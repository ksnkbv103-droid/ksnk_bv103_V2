-- Soft draft LOCAL ONLY — do NOT apply from Soft (mandate). Nghĩa/W4 or Cloud apply.
-- 25 / CSSD-L04 Domain A: catalog heat-split — parent_bo_id + vai_tro_tach on cssd_dm_bo_dung_cu.
-- Tip table verified: public.cssd_dm_bo_dung_cu (baseline + is_implant).
-- Không UI tách tại Đóng gói trong lát này; không đụng L07 used / L08 ledger / 18b AB.
-- Neo: docs/modules/cssd/25-CSSD-L04-PARENT-BO-SCHEMA-AB-20260928.md

ALTER TABLE public.cssd_dm_bo_dung_cu
  ADD COLUMN IF NOT EXISTS parent_bo_id uuid NULL,
  ADD COLUMN IF NOT EXISTS vai_tro_tach text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_dm_bo_dung_cu_parent_bo_id_fkey'
  ) THEN
    ALTER TABLE public.cssd_dm_bo_dung_cu
      ADD CONSTRAINT cssd_dm_bo_dung_cu_parent_bo_id_fkey
      FOREIGN KEY (parent_bo_id) REFERENCES public.cssd_dm_bo_dung_cu(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_dm_bo_dung_cu_vai_tro_tach_check'
  ) THEN
    ALTER TABLE public.cssd_dm_bo_dung_cu
      ADD CONSTRAINT cssd_dm_bo_dung_cu_vai_tro_tach_check
      CHECK (
        vai_tro_tach IS NULL
        OR vai_tro_tach = ANY (ARRAY['CHIU_NHIET'::text, 'KHONG_CHIU_NHIET'::text])
      );
  END IF;
END $$;

-- Thành phần mới có parent; mẹ không tự trỏ mình
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cssd_dm_bo_dung_cu_parent_not_self'
  ) THEN
    ALTER TABLE public.cssd_dm_bo_dung_cu
      ADD CONSTRAINT cssd_dm_bo_dung_cu_parent_not_self
      CHECK (parent_bo_id IS NULL OR parent_bo_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cssd_dm_bo_dung_cu_parent_bo_id
  ON public.cssd_dm_bo_dung_cu (parent_bo_id)
  WHERE parent_bo_id IS NOT NULL;

COMMENT ON COLUMN public.cssd_dm_bo_dung_cu.parent_bo_id IS
  'CSSD-L04 Lock A: FK bộ mẹ khi đây là thành phần tách nhiệt. Mẹ = NULL.';
COMMENT ON COLUMN public.cssd_dm_bo_dung_cu.vai_tro_tach IS
  'CSSD-L04: CHIU_NHIET | KHONG_CHIU_NHIET trên thành phần; NULL trên bộ thường/mẹ.';

-- Helper view: mẹ cần tách khi BOM lẫn nhiệt (derive; Soft map requireSplit khi wire)
CREATE OR REPLACE VIEW public.v_cssd_bo_heat_split_hint
WITH (security_invoker = true) AS
SELECT
  b.id AS bo_id,
  b.ma_bo,
  b.ten_bo,
  b.parent_bo_id,
  b.vai_tro_tach,
  EXISTS (
    SELECT 1
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
    WHERE c.bo_dung_cu_id = b.id AND c.is_active IS TRUE AND l.is_chiu_nhiet IS TRUE
  ) AS has_chiu_nhiet,
  EXISTS (
    SELECT 1
    FROM public.cssd_dm_bo_dung_cu_chi_tiet c
    JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
    WHERE c.bo_dung_cu_id = b.id AND c.is_active IS TRUE AND l.is_chiu_nhiet IS FALSE
  ) AS has_khong_chiu_nhiet,
  (
    b.parent_bo_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
      JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
      WHERE c.bo_dung_cu_id = b.id AND c.is_active IS TRUE AND l.is_chiu_nhiet IS TRUE
    )
    AND EXISTS (
      SELECT 1 FROM public.cssd_dm_bo_dung_cu_chi_tiet c
      JOIN public.cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
      WHERE c.bo_dung_cu_id = b.id AND c.is_active IS TRUE AND l.is_chiu_nhiet IS FALSE
    )
  ) AS require_split
FROM public.cssd_dm_bo_dung_cu b
WHERE b.is_active IS TRUE;

GRANT SELECT ON public.v_cssd_bo_heat_split_hint TO authenticated, service_role;

COMMENT ON VIEW public.v_cssd_bo_heat_split_hint IS
  'CSSD-L04: derive require_split khi BOM mẹ lẫn chịu/không chịu nhiệt. Soft Soft-safe — chưa wire UI Đóng gói.';

NOTIFY pgrst, 'reload schema';
