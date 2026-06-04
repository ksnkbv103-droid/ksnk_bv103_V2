-- Smoke: GSC/VST strategic + compare matrices RPC (fail fast via RAISE EXCEPTION).
DO $smoke$
DECLARE
  v_tu date := (date_trunc('month', CURRENT_DATE::timestamp) - INTERVAL '2 month')::date;
  v_den date := CURRENT_DATE::date;
  j jsonb;
BEGIN
  j := public.rpc_dashboard_vst_strategic_analytics(v_tu, v_den, NULL, NULL, NULL, NULL, NULL);
  IF NOT (
    j ? 'kpis'
    AND j->'kpis' ? 'ty_le_tuan_thu'
    AND j ? 'matrix_khoa'
    AND j ? 'matrix_nghe'
    AND j ? 'moments'
    AND j ? 'gap_analysis'
    AND j ? 'trendline'
  ) THEN
    RAISE EXCEPTION 'rpc_dashboard_vst_strategic_analytics: thiếu key bắt buộc — %', j;
  END IF;

  j := public.rpc_vst_compare_matrices(v_tu, v_den, NULL, NULL, NULL, NULL, NULL);
  IF NOT (j ? 'matrix_khu_vuc' AND j ? 'matrix_hinh_thuc') THEN
    RAISE EXCEPTION 'rpc_vst_compare_matrices: thiếu matrix — %', j;
  END IF;

  j := public.rpc_dashboard_gsc_strategic_analytics(v_tu, v_den, NULL, NULL, NULL, NULL, NULL, NULL);
  IF NOT (
    j ? 'kpis'
    AND j->'kpis' ? 'tong_quan_sat'
    AND j ? 'matrix_khoa'
    AND j ? 'gap_analysis'
    AND j ? 'trendline'
    AND j ? 'dynamic_checklists'
  ) THEN
    RAISE EXCEPTION 'rpc_dashboard_gsc_strategic_analytics: thiếu key bắt buộc — %', j;
  END IF;

  j := public.rpc_gsc_compare_matrices(v_tu, v_den, NULL, NULL, NULL, NULL, NULL, NULL);
  IF NOT (
    j ? 'matrix_khu_vuc'
    AND j ? 'matrix_nghe'
    AND j ? 'matrix_hinh_thuc'
    AND j ? 'matrix_cach_thuc'
  ) THEN
    RAISE EXCEPTION 'rpc_gsc_compare_matrices: thiếu matrix — %', j;
  END IF;

  RAISE NOTICE 'gsc-vst-rpc-smoke: OK (% → %)', v_tu, v_den;
END;
$smoke$;
