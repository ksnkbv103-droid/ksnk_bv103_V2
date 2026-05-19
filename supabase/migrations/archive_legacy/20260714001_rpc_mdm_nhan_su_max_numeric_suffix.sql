-- Max hậu tố số của ma_nv theo tiền tố (VD NV -> NV001..) — phục vụ sinh mã, tránh đọc full cột ma_nv.

CREATE OR REPLACE FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(p_prefix text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    max(
      (substring(upper(btrim(m.ma_nv)) from (char_length(b.prefix) + 1)))::bigint
    ),
    0
  )::integer
  FROM public.mdm_nhan_su m
  CROSS JOIN LATERAL (
    SELECT upper(btrim(coalesce(p_prefix, ''))) AS prefix
  ) b
  WHERE b.prefix <> ''
    AND char_length(b.prefix) BETWEEN 1 AND 12
    AND m.ma_nv IS NOT NULL
    AND upper(btrim(m.ma_nv)) LIKE b.prefix || '%'
    AND substring(upper(btrim(m.ma_nv)) from char_length(b.prefix) + 1) ~ '^[0-9]+$';
$$;

COMMENT ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) IS
  'Sinh mã nhân sự: max phần số sau tiền tố ma_nv (mdm_nhan_su), RLS theo người gọi.';

REVOKE ALL ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) TO anon, authenticated, service_role;

-- Bảng kiểm: max hậu tố số của ma_bk theo tiền tố (VD BK -> BK001..).

CREATE OR REPLACE FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(p_prefix text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    max(
      (substring(upper(btrim(d.ma_bk)) from (char_length(b.prefix) + 1)))::bigint
    ),
    0
  )::integer
  FROM public.dm_bang_kiem d
  CROSS JOIN LATERAL (
    SELECT upper(btrim(coalesce(p_prefix, ''))) AS prefix
  ) b
  WHERE b.prefix <> ''
    AND char_length(b.prefix) BETWEEN 1 AND 12
    AND d.ma_bk IS NOT NULL
    AND d.is_active = true
    AND upper(btrim(d.ma_bk)) LIKE b.prefix || '%'
    AND substring(upper(btrim(d.ma_bk)) from char_length(b.prefix) + 1) ~ '^[0-9]+$';
$$;

COMMENT ON FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(text) IS
  'Sinh mã bảng kiểm: max phần số sau tiền tố ma_bk (dm_bang_kiem, is_active), RLS theo người gọi.';

REVOKE ALL ON FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dm_bang_kiem_max_numeric_suffix(text) TO anon, authenticated, service_role;
