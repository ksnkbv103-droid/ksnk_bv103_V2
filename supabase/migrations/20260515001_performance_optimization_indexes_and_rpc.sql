-- [BV103] Performance Optimization Migration
-- 1. Thêm index lọc theo (is_active, ngay_giam_sat, loai_bang_kiem) cho dashboard hot path
-- 2. rpc_get_compliance_dashboard_multi_v1: nhánh 1 mã BK gọi v2 một lần (tương đương 1 vòng FOREACH);
--    N>1 vẫn FOREACH — tối ưu triệt để cần refactor v2 hoặc gộp SQL.

-- 1. INDEXES
CREATE INDEX IF NOT EXISTS idx_gsc_sessions_perf_filter 
ON public.fact_giam_sat_chung_sessions (is_active, ngay_giam_sat, loai_bang_kiem);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_khoa_id 
ON public.fact_giam_sat_chung_sessions (khoa_id);

CREATE INDEX IF NOT EXISTS idx_vst_sessions_perf_filter 
ON public.fact_giam_sat_vst_sessions (is_active, ngay_giam_sat);

CREATE INDEX IF NOT EXISTS idx_vst_sessions_khoa_id 
ON public.fact_giam_sat_vst_sessions (khoa_id);

-- 2. MULTI RPC (giữ hành vi; thêm fast path đơn mã BK)
CREATE OR REPLACE FUNCTION public.rpc_get_compliance_dashboard_multi_v1(
  p_tu_ngay date,
  p_den_ngay date,
  p_bang_kiem_mas text[],
  p_khoi_ids uuid[] DEFAULT NULL,
  p_khoa_ids uuid[] DEFAULT NULL,
  p_nghe_nghiep_ids uuid[] DEFAULT NULL,
  p_khu_vuc_ids uuid[] DEFAULT NULL,
  p_supervision_type text DEFAULT 'ALL'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ma_bk text;
  v_result jsonb := '{}'::jsonb;
  v_sub_res jsonb;
BEGIN
  IF array_length(p_bang_kiem_mas, 1) = 1 THEN
    v_ma_bk := p_bang_kiem_mas[1];
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    RETURN jsonb_build_object(v_ma_bk, v_sub_res);
  END IF;

  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk],
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;

    v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
  END LOOP;

  RETURN v_result;
END;
$$;
