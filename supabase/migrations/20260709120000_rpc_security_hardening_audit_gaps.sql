-- BE-RPC-01: fn_qlcv_update_checklist — chỉ service_role (app dùng admin client).
-- BE-RPC-02: Harden GSC analytics RPC như VST (fn_require_gstt_analytics_access).
-- BE-RPC-03: CSSD workflow RPC — yêu cầu CSSD_WORKFLOW edit + revoke anon.

BEGIN;

-- === BE-RPC-01: QLCV checklist ===
REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) TO service_role;

COMMENT ON FUNCTION public.fn_qlcv_update_checklist(uuid, jsonb, integer, text) IS
  'Ghi checklist/% hoàn thành. Chỉ service_role — app gọi qua admin client sau ensureQlcvKsnkAccess.';

-- === BE-RPC-02: GSC strategic analytics wrapper ===
ALTER FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) RENAME TO rpc_dashboard_gsc_strategic_analytics_impl;

REVOKE ALL ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL,
  p_bang_kiem_mas text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_gstt_analytics_access('GIAM_SAT_CHUNG');
  RETURN public.rpc_dashboard_gsc_strategic_analytics_impl(
    p_tu_ngay,
    p_den_ngay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids,
    p_bang_kiem_mas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_gsc_strategic_analytics(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) TO authenticated, service_role;

-- === BE-RPC-02: GSC checklist detail wrapper ===
ALTER FUNCTION public.rpc_gsc_checklist_detail(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) RENAME TO rpc_gsc_checklist_detail_impl;

REVOKE ALL ON FUNCTION public.rpc_gsc_checklist_detail_impl(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gsc_checklist_detail_impl(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_gsc_checklist_detail_impl(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_gsc_checklist_detail_impl(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_gsc_checklist_detail(
  p_tu_ngay date,
  p_den_ngay date,
  p_ma_bk text,
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
  PERFORM public.fn_require_gstt_analytics_access('GIAM_SAT_CHUNG');
  RETURN public.rpc_gsc_checklist_detail_impl(
    p_tu_ngay,
    p_den_ngay,
    p_ma_bk,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_gsc_checklist_detail(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gsc_checklist_detail(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_gsc_checklist_detail(
  date, date, text, uuid[], uuid[], uuid[], uuid[], text[]
) TO authenticated, service_role;

-- === BE-RPC-02: GSC compare matrices wrapper ===
ALTER FUNCTION public.rpc_gsc_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) RENAME TO rpc_gsc_compare_matrices_impl;

REVOKE ALL ON FUNCTION public.rpc_gsc_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gsc_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_gsc_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_gsc_compare_matrices_impl(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_gsc_compare_matrices(
  p_tu_ngay date,
  p_den_ngay date,
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_hinh_thuc_ids text[] DEFAULT NULL,
  p_bang_kiem_mas text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
BEGIN
  PERFORM public.fn_require_gstt_analytics_access('GIAM_SAT_CHUNG');
  RETURN public.rpc_gsc_compare_matrices_impl(
    p_tu_ngay,
    p_den_ngay,
    p_khoi_ids,
    p_khoa_ids,
    p_nghe_nghiep_ids,
    p_khu_vuc_ids,
    p_hinh_thuc_ids,
    p_bang_kiem_mas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_gsc_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gsc_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_gsc_compare_matrices(
  date, date, uuid[], uuid[], uuid[], uuid[], text[], text[]
) TO authenticated, service_role;

-- === BE-RPC-03: CSSD RPC permission gate ===
CREATE OR REPLACE FUNCTION public.fn_require_cssd_workflow_edit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- App CSSD dùng admin client (service_role) sau verifyCssdWorkflowEdit — cho phép bypass JWT.
  IF auth.uid() IS NULL THEN
    IF coalesce(auth.role(), '') = 'service_role' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'authentication required for CSSD workflow RPC'
      USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  ) THEN
    RAISE EXCEPTION 'permission denied for CSSD_WORKFLOW edit'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_require_cssd_workflow_edit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_require_cssd_workflow_edit() TO authenticated, service_role;

-- Wrap rpc_scan_workflow_station
ALTER FUNCTION public.rpc_scan_workflow_station(text, text, text)
  RENAME TO rpc_scan_workflow_station_impl;

REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_scan_workflow_station_impl(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(
  p_ma_qr text,
  p_target_station text,
  p_operator_label text DEFAULT 'CSSD'::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  RETURN public.rpc_scan_workflow_station_impl(p_ma_qr, p_target_station, p_operator_label);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_scan_workflow_station(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_scan_workflow_station(text, text, text)
  TO authenticated, service_role;

-- Wrap rpc_cssd_assign_cycle_qr
ALTER FUNCTION public.rpc_cssd_assign_cycle_qr(uuid)
  RENAME TO rpc_cssd_assign_cycle_qr_impl;

REVOKE ALL ON FUNCTION public.rpc_cssd_assign_cycle_qr_impl(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cssd_assign_cycle_qr_impl(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_cssd_assign_cycle_qr_impl(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_assign_cycle_qr_impl(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_cssd_assign_cycle_qr(p_quy_trinh_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  RETURN public.rpc_cssd_assign_cycle_qr_impl(p_quy_trinh_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_assign_cycle_qr(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cssd_assign_cycle_qr(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_assign_cycle_qr(uuid)
  TO authenticated, service_role;

-- Wrap rpc_cssd_persist_bom_checkpoint
ALTER FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid)
  RENAME TO rpc_cssd_persist_bom_checkpoint_impl;

REVOKE ALL ON FUNCTION public.rpc_cssd_persist_bom_checkpoint_impl(uuid, jsonb, jsonb, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cssd_persist_bom_checkpoint_impl(uuid, jsonb, jsonb, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_cssd_persist_bom_checkpoint_impl(uuid, jsonb, jsonb, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_persist_bom_checkpoint_impl(uuid, jsonb, jsonb, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.rpc_cssd_persist_bom_checkpoint(
  p_quy_trinh_id uuid,
  p_bom_lines jsonb,
  p_deltas jsonb,
  p_do_split text,
  p_operator_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  RETURN public.rpc_cssd_persist_bom_checkpoint_impl(
    p_quy_trinh_id, p_bom_lines, p_deltas, p_do_split, p_operator_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_persist_bom_checkpoint(uuid, jsonb, jsonb, text, uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
