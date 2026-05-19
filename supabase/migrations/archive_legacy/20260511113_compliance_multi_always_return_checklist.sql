-- Luôn trả về từng mã bảng kiểm được yêu cầu (kể cả chưa có phiên) để dashboard theo từng BK không bị “mất” khỏi JSON.
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
  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay,
      p_den_ngay,
      ARRAY[v_ma_bk],
      p_khoi_ids,
      p_khoa_ids,
      p_nghe_nghiep_ids,
      p_khu_vuc_ids,
      p_supervision_type
    )
    INTO v_sub_res;

    v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
  END LOOP;

  RETURN v_result;
END;
$$;
