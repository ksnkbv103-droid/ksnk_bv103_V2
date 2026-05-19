-- BV103: Gỡ nhật ký thay đổi tự động (fact_activity_log + fn_auto_audit_log).
-- Lý do: giảm ghi dư thừa / kích thước DB; ứng dụng không đọc bảng này.
-- Thứ tự: sửa RPC còn INSERT trực tiếp → bỏ trigger + function → drop bảng.

CREATE OR REPLACE FUNCTION public.rpc_scan_workflow_station(
  p_ma_qr text,
  p_target_station text,
  p_operator_label text DEFAULT 'CSSD'::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
  v_current_idx INT;
  v_target_idx INT;
BEGIN
  SELECT * INTO v_row FROM public.fact_quy_trinh
  WHERE UPPER(ma_qr_quy_trinh) = UPPER(p_ma_qr) AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Không tìm thấy bộ dụng cụ hoặc bộ chưa được tiếp nhận.');
  END IF;

  IF v_row.is_dong_bang = true THEN
    RETURN json_build_object('success', false, 'message', 'Bộ dụng cụ ' || p_ma_qr || ' đang bị khóa an toàn (đóng băng).');
  END IF;

  v_current_idx := CASE v_row.ma_trang_thai_hien_tai
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  v_target_idx := CASE p_target_station
    WHEN 'TIEP_NHAN' THEN 0 WHEN 'LAM_SACH' THEN 1 WHEN 'QC' THEN 2
    WHEN 'DONG_GOI' THEN 3 WHEN 'TIET_KHUAN' THEN 4 WHEN 'CAP_PHAT' THEN 5 ELSE -1 END;

  IF NOT (v_row.ma_trang_thai_hien_tai = 'CAP_PHAT' AND p_target_station = 'TIEP_NHAN') THEN
    IF v_target_idx != v_current_idx + 1 THEN
      RETURN json_build_object('success', false, 'message', 'Sai trạm! Quy trình đang ở bước ' || v_row.ma_trang_thai_hien_tai);
    END IF;
  END IF;

  UPDATE public.fact_quy_trinh
  SET ma_trang_thai_hien_tai = p_target_station, updated_at = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'success',
    true,
    'data',
    jsonb_build_object('den', p_target_station, 'operator', p_operator_label)
  );
END;
$$;

-- Index cũ trên fact_activity_log (nếu còn) — DROP TABLE CASCADE cũng xóa; dọn tường minh.
DROP INDEX IF EXISTS public.idx_activity_log_user_id;
DROP INDEX IF EXISTS public.idx_activity_log_table_name;
DROP INDEX IF EXISTS public.idx_activity_log_record_id;
DROP INDEX IF EXISTS public.idx_activity_log_table_created;
DROP INDEX IF EXISTS public.idx_activity_log_created_at;
DROP INDEX IF EXISTS public.idx_activity_log_userid;
DROP INDEX IF EXISTS public.idx_activity_log_tablename;
DROP INDEX IF EXISTS public.idx_activity_log_recordid;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND p.proname = 'fn_auto_audit_log'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.tbl);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.fn_auto_audit_log() CASCADE;

DROP TABLE IF EXISTS public.fact_activity_log CASCADE;
