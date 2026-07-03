-- Re-drop compat view dm_bang_kiem (recreated by 20260613103000 for ap_dung_jsonb).
-- App SSOT: gstt_dm_bang_kiem + v_gstt_bang_kiem_full + rpc_gstt_dm_bang_kiem_max_numeric_suffix.

BEGIN;

DROP VIEW IF EXISTS public.dm_bang_kiem CASCADE;

CREATE OR REPLACE FUNCTION public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(p_prefix text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    MAX(
      NULLIF(
        regexp_replace(d.ma_bk, '^' || p_prefix || '([0-9]+)$', '\1'),
        d.ma_bk
      )::integer
    ),
    0
  )
  FROM public.gstt_dm_bang_kiem d
  WHERE d.is_active = true
    AND d.ma_bk ~ ('^' || p_prefix || '[0-9]+$');
$$;

COMMENT ON FUNCTION public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(text) IS
  'Sinh mã bảng kiểm: max phần số sau tiền tố ma_bk (gstt_dm_bang_kiem, is_active).';

CREATE OR REPLACE FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(p_prefix text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(p_prefix);
$$;

COMMENT ON FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(text) IS
  '[compat] -> rpc_gstt_dm_bang_kiem_max_numeric_suffix';

GRANT EXECUTE ON FUNCTION public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(text) TO anon, authenticated, service_role;

COMMIT;
