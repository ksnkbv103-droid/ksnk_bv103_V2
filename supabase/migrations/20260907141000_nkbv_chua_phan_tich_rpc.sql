-- Batch 6.2 — NKBV «chưa phân tích»: BA / XN (+) chưa gắn sự kiện Index / disposition.
-- Aligns with resolveViSinhAnalysisStatus + hub dispositions (index, attributed, metadata).

CREATE OR REPLACE FUNCTION public.fn_nkbv_norm_vi_sinh_id(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN btrim(p) = '' THEN NULL
    WHEN lower(btrim(p)) LIKE 'lis:%' THEN NULLIF(btrim(substr(btrim(p), 5)), '')
    ELSE btrim(p)
  END;
$$;

COMMENT ON FUNCTION public.fn_nkbv_norm_vi_sinh_id(text) IS
  'Chuẩn hoá id XN vi sinh (bỏ tiền tố lis:) cho khớp disposition / Index.';

CREATE OR REPLACE VIEW public.v_nkbv_vi_sinh_chua_phan_tich
WITH (security_invoker = true)
AS
WITH pos AS (
  SELECT
    v.id,
    NULLIF(btrim(v.ma_benh_an), '') AS ma_benh_an,
    v.metadata
  FROM public.nkbv_fact_vi_sinh v
  WHERE v.is_active = true
    AND upper(COALESCE(v.ket_qua_phan_loai, '')) <> 'AM_TINH'
    AND (
      upper(COALESCE(v.ket_qua_phan_loai, '')) = 'DUONG_TINH'
      OR v.ket_qua_duong_tinh IS TRUE
      OR (v.tac_nhan IS NOT NULL AND btrim(v.tac_nhan) <> '')
    )
),
handled AS (
  -- Index case link (bất kỳ disposition, kể cả null = đã PT)
  SELECT DISTINCT public.fn_nkbv_norm_vi_sinh_id(s.verification_data ->> 'index_vi_sinh_id') AS vs_id
  FROM public.nkbv_fact_su_kien s
  WHERE s.is_active = true
    AND s.verification_data ? 'index_vi_sinh_id'
    AND public.fn_nkbv_norm_vi_sinh_id(s.verification_data ->> 'index_vi_sinh_id') IS NOT NULL
  UNION
  -- attributed_vi_sinh_ids trên phiếu
  SELECT DISTINCT public.fn_nkbv_norm_vi_sinh_id(x.aid) AS vs_id
  FROM public.nkbv_fact_su_kien s
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE
      WHEN jsonb_typeof(s.verification_data -> 'attributed_vi_sinh_ids') = 'array'
        THEN s.verification_data -> 'attributed_vi_sinh_ids'
      ELSE '[]'::jsonb
    END
  ) AS x(aid)
  WHERE s.is_active = true
  UNION
  -- metadata disposition trên chính bản ghi XN
  SELECT v.id::text AS vs_id
  FROM public.nkbv_fact_vi_sinh v
  WHERE v.is_active = true
    AND v.metadata ->> 'analysis_disposition' IN ('BO_QUA', 'DA_PHAN_TICH', 'KHONG_DU_TC')
)
SELECT p.id, p.ma_benh_an
FROM pos p
WHERE p.ma_benh_an IS NOT NULL
  AND p.id::text NOT IN (SELECT h.vs_id FROM handled h WHERE h.vs_id IS NOT NULL);

COMMENT ON VIEW public.v_nkbv_vi_sinh_chua_phan_tich IS
  'XN vi sinh (+) chưa phân tích / chưa bỏ qua — neo Index + attributed + metadata disposition.';

GRANT SELECT ON public.v_nkbv_vi_sinh_chua_phan_tich TO authenticated;
GRANT SELECT ON public.v_nkbv_vi_sinh_chua_phan_tich TO service_role;

CREATE OR REPLACE FUNCTION public.fn_nkbv_ba_keys_chua_phan_tich()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT ma_benh_an ORDER BY ma_benh_an),
    '{}'::text[]
  )
  FROM public.v_nkbv_vi_sinh_chua_phan_tich
  WHERE ma_benh_an IS NOT NULL;
$$;

COMMENT ON FUNCTION public.fn_nkbv_ba_keys_chua_phan_tich() IS
  'Danh sách ma_benh_an còn ≥1 XN (+) chưa phân tích — thay scan FE cap 1500.';

GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_keys_chua_phan_tich() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_ba_keys_chua_phan_tich() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_norm_vi_sinh_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_norm_vi_sinh_id(text) TO service_role;
