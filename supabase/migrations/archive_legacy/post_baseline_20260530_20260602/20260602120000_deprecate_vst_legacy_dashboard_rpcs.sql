-- Deprecate legacy VST dashboard RPCs (app uses rpc_dashboard_vst_strategic_analytics since 2026-05-30).

CREATE OR REPLACE FUNCTION public.rpc_get_vst_dashboard(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoa_ids uuid[] DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_dashboard is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;

COMMENT ON FUNCTION public.rpc_get_vst_dashboard(date, date, uuid[]) IS
  'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';

CREATE OR REPLACE FUNCTION public.rpc_get_vst_dashboard_v2(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_trend_type text DEFAULT 'month',
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_dashboard_v2 is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;

COMMENT ON FUNCTION public.rpc_get_vst_dashboard_v2(
  date, date, uuid[], uuid[], uuid[], uuid[], text, text
) IS 'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';

CREATE OR REPLACE FUNCTION public.rpc_get_vst_moment_table_only(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_trend_type text DEFAULT 'month',
  p_supervision_type text DEFAULT 'ALL'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'rpc_get_vst_moment_table_only is deprecated (2026-06-02). Use rpc_dashboard_vst_strategic_analytics instead.'
    USING ERRCODE = '57000';
END;
$$;

COMMENT ON FUNCTION public.rpc_get_vst_moment_table_only(
  date, date, uuid[], uuid[], uuid[], uuid[], text, text
) IS 'DEPRECATED 2026-06-02: superseded by rpc_dashboard_vst_strategic_analytics.';
