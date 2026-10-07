-- Batch 10b — waiting Tiếp nhận: offset + search (load-more / tìm thêm).
DROP FUNCTION IF EXISTS public.rpc_cssd_waiting_tiep_nhan(integer);

CREATE OR REPLACE FUNCTION public.rpc_cssd_waiting_tiep_nhan(
  p_limit integer DEFAULT 40,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  ma_bo text,
  ten_bo text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.ma_bo::text,
    b.ten_bo::text,
    b.updated_at
  FROM public.cssd_dm_bo_dung_cu b
  WHERE b.is_active = true
    AND upper(btrim(coalesce(b.ma_bo, ''))) ~ '^[A-Z0-9][A-Z0-9.-]*\.SET\.[0-9]{2,}$'
    AND NOT EXISTS (
      SELECT 1
      FROM public.cssd_fact_quy_trinh q
      WHERE q.bo_dung_cu_id = b.id
        AND q.is_active = true
        AND q.tram_hien_tai_id IS NOT NULL
    )
    AND (
      p_search IS NULL
      OR btrim(p_search) = ''
      OR b.ma_bo ILIKE '%' || btrim(p_search) || '%'
      OR b.ten_bo ILIKE '%' || btrim(p_search) || '%'
    )
  ORDER BY b.updated_at DESC NULLS LAST, b.ma_bo ASC
  LIMIT least(greatest(coalesce(p_limit, 40), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

COMMENT ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer, integer, text) IS
  'Batch 10b — chờ Tiếp nhận: trang/offset + tìm ma/ten; cap page 1–100.';

GRANT EXECUTE ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_waiting_tiep_nhan(integer, integer, text) TO service_role;
