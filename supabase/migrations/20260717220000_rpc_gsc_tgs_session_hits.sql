-- RPC hits phiên TGS theo khoa/BK — app không select trực tiếp gstt_fact_gsc_dashboard_summary.
-- VIEW summary vẫn live (scan session); RPC chỉ là cửa vào chuẩn cho «BK tôi» / bao phủ TGS.

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_gsc_tgs_session_hits(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoa_id uuid DEFAULT NULL
)
RETURNS TABLE (
  khoa_id uuid,
  bang_kiem_id uuid,
  session_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.khoa_id,
    s.bang_kiem_id,
    s.session_id
  FROM public.gstt_fact_gsc_dashboard_summary s
  WHERE s.stype = 'TU_GIAM_SAT'
    AND s.ngay_giam_sat >= p_tu_ngay
    AND s.ngay_giam_sat <= p_den_ngay
    AND (p_khoa_id IS NULL OR s.khoa_id = p_khoa_id);
$$;

COMMENT ON FUNCTION public.rpc_gsc_tgs_session_hits(date, date, uuid) IS
  'Distinct TGS session hits (khoa × BK) trong kỳ — dùng bao phủ TGS / BK tôi phải TGS.';

GRANT EXECUTE ON FUNCTION public.rpc_gsc_tgs_session_hits(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_gsc_tgs_session_hits(date, date, uuid) TO service_role;

COMMIT;
