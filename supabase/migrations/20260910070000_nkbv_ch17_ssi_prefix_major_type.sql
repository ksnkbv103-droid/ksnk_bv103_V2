-- NKBV: CH17:* và SSI:* (evaluateCh17) vào tử số đúng major type.
-- Mirror nkbv-classification-taxonomy.ts. Additive REPLACE function only.

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
      OR upper(btrim(p_classification)) LIKE 'ORGAN_SPACE%'
      OR upper(btrim(p_classification)) LIKE 'SSI:%' THEN 'SSI'
    WHEN upper(btrim(p_classification)) LIKE 'CH17:%' THEN 'CH17'
    ELSE 'OTHER'
  END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_major_type_from_classification(text) IS
  'Major type NKBV từ verification_data->>classification. CH17:*→CH17; SSI:/ORGAN_SPACE/SIP…→SSI. Mirror nkbv-classification-taxonomy.ts.';
