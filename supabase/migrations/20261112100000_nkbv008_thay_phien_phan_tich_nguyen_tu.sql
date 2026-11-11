-- NKBV-008: replaceNkbvBaPhanTichSessions thay bộ nháp phân tích BA bằng 3–4 lệnh rời
-- (đọc id active → tắt → chèn → bật lại nếu chèn lỗi). Không nguyên tử: lỗi giữa chừng hoặc
-- hai người lưu đồng thời làm mất / nhân đôi bộ active theo (ma_benh_an, analysis_mode).
--  - Thêm RPC rpc_nkbv_replace_ba_phan_tich_sessions: một transaction, khóa advisory theo
--    cặp (ma_benh_an, analysis_mode), tắt bộ active cũ, chèn bộ mới từ p_rows (jsonb array).
--    p_rows rỗng = chỉ tắt. Một dòng lỗi → RAISE → rollback cả hàm, bộ cũ giữ nguyên.
--  - Additive: không đổi bảng nkbv_fact_ba_phan_tich (20260909093000).
--  - SECURITY DEFINER + search_path public như các RPC nkbv khác; EXECUTE chỉ service_role
--    (action kiểm quyền GIAM_SAT_NKBV + phạm vi khoa trước khi gọi bằng admin client).
--  - Mỗi phần tử p_rows: {session_id, panel, index_payload, index_label, draft,
--    created_at?, updated_at?}. ma_benh_an / analysis_mode / is_active lấy từ tham số, bỏ qua
--    nếu có trong phần tử.

CREATE OR REPLACE FUNCTION public.rpc_nkbv_replace_ba_phan_tich_sessions(
  p_ma_benh_an text,
  p_analysis_mode text,
  p_rows jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ma text := btrim(coalesce(p_ma_benh_an, ''));
  v_mode text := upper(btrim(coalesce(p_analysis_mode, '')));
  v_rows jsonb := coalesce(p_rows, '[]'::jsonb);
  v_now timestamptz := timezone('utc'::text, now());
  v_off integer := 0;
  v_ins integer := 0;
BEGIN
  IF v_ma = '' THEN
    RAISE EXCEPTION 'Thiếu mã bệnh án';
  END IF;
  IF v_mode NOT IN ('CDC', 'MANUAL') THEN
    RAISE EXCEPTION 'Chế độ phân tích không hợp lệ: %', p_analysis_mode;
  END IF;
  IF jsonb_typeof(v_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows phải là mảng JSON';
  END IF;

  -- Tuần tự hóa mọi lần thay bộ trên cùng (bệnh án, chế độ); nhả khi transaction kết thúc.
  PERFORM pg_advisory_xact_lock(hashtext('nkbv_ba_phan_tich'), hashtext(v_ma || '|' || v_mode));

  UPDATE public.nkbv_fact_ba_phan_tich
     SET is_active = false, updated_at = v_now
   WHERE ma_benh_an = v_ma
     AND analysis_mode = v_mode
     AND is_active = true;
  GET DIAGNOSTICS v_off = ROW_COUNT;

  IF jsonb_array_length(v_rows) > 0 THEN
    INSERT INTO public.nkbv_fact_ba_phan_tich
      (ma_benh_an, session_id, analysis_mode, panel, index_payload, index_label, draft,
       created_at, updated_at, is_active)
    SELECT v_ma,
           e->>'session_id',
           v_mode,
           e->>'panel',
           coalesce(e->'index_payload', '{}'::jsonb),
           coalesce(e->>'index_label', ''),
           coalesce(e->'draft', '{}'::jsonb),
           coalesce(nullif(e->>'created_at', '')::timestamptz, v_now),
           coalesce(nullif(e->>'updated_at', '')::timestamptz, v_now),
           true
      FROM jsonb_array_elements(v_rows) AS e;
    GET DIAGNOSTICS v_ins = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('deactivated', v_off, 'inserted', v_ins);
END;
$function$;

COMMENT ON FUNCTION public.rpc_nkbv_replace_ba_phan_tich_sessions(text, text, jsonb) IS
  'NKBV-008: thay nguyên tử bộ nháp phân tích BA active theo (ma_benh_an, analysis_mode). Chỉ service_role.';

REVOKE ALL ON FUNCTION public.rpc_nkbv_replace_ba_phan_tich_sessions(text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_nkbv_replace_ba_phan_tich_sessions(text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_nkbv_replace_ba_phan_tich_sessions(text, text, jsonb) TO service_role;

-- ============================================================================
-- CHƯA APPLY PROD — chờ PO
-- SQL kiểm prod (chỉ đọc):
--   SELECT to_regprocedure('public.rpc_nkbv_replace_ba_phan_tich_sessions(text,text,jsonb)') IS NOT NULL AS da_apply;
--   SELECT proacl FROM pg_proc WHERE proname = 'rpc_nkbv_replace_ba_phan_tich_sessions';  -- kỳ vọng chỉ postgres + service_role
--   -- Dấu vết lỗi cũ: cặp (BA, mode) có session_id active trùng là không thể (unique index),
--   -- nhưng bộ bị mất thì xem BA có dòng đã tắt mà không còn dòng active:
--   SELECT ma_benh_an, analysis_mode, count(*) FILTER (WHERE is_active) AS active, count(*) AS tong
--     FROM public.nkbv_fact_ba_phan_tich GROUP BY 1, 2 HAVING count(*) FILTER (WHERE is_active) = 0;
-- ============================================================================
-- Rollback (bỏ dấu comment):
-- DROP FUNCTION IF EXISTS public.rpc_nkbv_replace_ba_phan_tich_sessions(text, text, jsonb);
