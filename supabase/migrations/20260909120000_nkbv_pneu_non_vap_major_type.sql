-- NKBV: PNU*_NON_VAP (engine) cùng tử số PNEU với PNU*_HAP.
-- Không đổi bảng. Mirror nkbv-classification-taxonomy.ts.

CREATE OR REPLACE FUNCTION public.fn_nkbv_major_type_from_classification(p_classification text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE
    WHEN upper(btrim(coalesce(p_classification, ''))) = '' THEN 'OTHER'
    WHEN upper(btrim(p_classification)) IN
      ('CLABSI', 'MBI_LCBI', 'PRIMARY_BSI_NON_CLABSI', 'SECONDARY_BSI') THEN 'BSI'
    WHEN upper(btrim(p_classification)) IN
      ('CAUTI_SUTI', 'CAUTI_SUTI_2', 'CAUTI_ABUTI', 'SUTI', 'SUTI_2', 'ABUTI') THEN 'UTI'
    WHEN upper(btrim(p_classification)) IN ('VAC', 'IVAC', 'PVAP') THEN 'VAE'
    WHEN upper(btrim(p_classification)) ~ '^PNU[123]_(VAP|HAP|NON_VAP)$' THEN 'PNEU'
    WHEN upper(btrim(p_classification)) IN ('SIP', 'SIS', 'DIP', 'DIS')
      OR upper(btrim(p_classification)) LIKE 'ORGAN_SPACE%' THEN 'SSI'
    ELSE 'OTHER'
  END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_major_type_from_classification(text) IS
  'Major type NKBV từ verification_data->>classification. PNU VAP|HAP|NON_VAP → PNEU. Mirror nkbv-classification-taxonomy.ts.';
