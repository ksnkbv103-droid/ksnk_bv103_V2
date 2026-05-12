-- RPC lấy DASHBOARD CHI TIẾT cho NHIỀU bảng kiểm cùng lúc (Tránh gọi N lần)
CREATE OR REPLACE FUNCTION "public"."rpc_get_compliance_dashboard_multi_v1"(
  "p_tu_ngay" "date", "p_den_ngay" "date", 
  "p_bang_kiem_mas" "text"[], 
  "p_khoi_ids" "uuid"[] DEFAULT NULL, 
  "p_khoa_ids" "uuid"[] DEFAULT NULL, 
  "p_nghe_nghiep_ids" "uuid"[] DEFAULT NULL, 
  "p_khu_vuc_ids" "uuid"[] DEFAULT NULL, 
  "p_supervision_type" "text" DEFAULT 'ALL'
) RETURNS json LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
  v_ma_bk TEXT;
  v_result JSONB := '{}'::jsonb;
  v_sub_res JSONB;
BEGIN
  -- Lặp qua từng mã bảng kiểm trong danh sách yêu cầu
  FOREACH v_ma_bk IN ARRAY p_bang_kiem_mas
  LOOP
    -- Gọi hàm lấy dashboard chi tiết cho từng mã (Tận dụng logic đã có)
    SELECT rpc_get_compliance_dashboard_v2(
      p_tu_ngay, p_den_ngay, ARRAY[v_ma_bk], 
      p_khoi_ids, p_khoa_ids, p_nghe_nghiep_ids, p_khu_vuc_ids, p_supervision_type
    ) INTO v_sub_res;
    
    -- Chỉ add vào kết quả nếu bảng kiểm này có dữ liệu
    IF (v_sub_res->'summary'->>'tong_phien')::int > 0 THEN
      v_result := v_result || jsonb_build_object(v_ma_bk, v_sub_res);
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;
