-- VST security hardening: RLS quan sát theo phiên active; guard RPC analytics; revoke anon.

BEGIN;

-- === Helper: kiểm quyền analytics VST/GSC trong RPC SECURITY DEFINER ===
CREATE OR REPLACE FUNCTION public.fn_require_gstt_analytics_access(p_module text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required for analytics RPC'
      USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission(p_module, 'view')
  ) THEN
    RAISE EXCEPTION 'permission denied for % analytics', p_module
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_require_gstt_analytics_access(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_require_gstt_analytics_access(text) TO authenticated, service_role;

-- === RLS: quan sát chỉ khi phiên cha còn active ===
DROP POLICY IF EXISTS "vst_obs_select_permission" ON public.gstt_fact_vst;

CREATE POLICY "vst_obs_select_permission"
  ON public.gstt_fact_vst
  FOR SELECT
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR (
      public.fn_sys_has_permission('GIAM_SAT_VST', 'view')
      AND EXISTS (
        SELECT 1
        FROM public.gstt_fact_vst_sessions s
        WHERE s.id = session_id
          AND COALESCE(s.is_active, true) = true
      )
    )
  );

-- === RPC guard wrappers: rename impl → bọc kiểm quyền ===
ALTER FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) RENAME TO rpc_dashboard_vst_strategic_analytics_impl;

REVOKE ALL ON FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_vst_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_gstt_analytics_access('GIAM_SAT_VST');
  RETURN public.rpc_dashboard_vst_strategic_analytics_impl(
    p_tu_ngay,
    p_den_ngay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_vst_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) TO authenticated, service_role;

ALTER FUNCTION public.rpc_vst_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) RENAME TO rpc_vst_compare_matrices_impl;

REVOKE ALL ON FUNCTION public.rpc_vst_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_vst_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_vst_compare_matrices(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_gstt_analytics_access('GIAM_SAT_VST');
  RETURN public.rpc_vst_compare_matrices_impl(
    p_tu_ngay,
    p_den_ngay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_vst_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_vst_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_vst_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[]
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
