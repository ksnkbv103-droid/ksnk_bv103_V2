-- CSSD trả lui: rpc_cssd_nhat_ky_ghi gọi qua admin client (service_role) luôn trả «chưa gắn hồ sơ nhân sự»
-- vì fn_cssd_operator_nhan_su_id(NULL) cần auth.uid(). Theo mẫu rpc_cssd_me_*: nhận p_actor_user_id,
-- người thao tác lấy qua fn_cssd_me_nguoi_thao_tac (auth.uid() thắng khi có; actor chỉ dùng khi service_role).
-- Hoàn tác: DROP hàm 6 tham số, CREATE lại bản 5 tham số từ 20261030010000 (mục 4) + REVOKE/GRANT như cũ.

DROP FUNCTION IF EXISTS public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.rpc_cssd_nhat_ky_ghi(
  p_quy_trinh_id uuid,
  p_su_kien text,
  p_tram text,
  p_nguon text DEFAULT NULL,
  p_chi_tiet jsonb DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_ns uuid;
BEGIN
  PERFORM public.fn_require_cssd_workflow_edit();
  IF p_su_kien NOT IN ('TRA_VE', 'CHON_BO') THEN
    RETURN json_build_object('success', false, 'message', 'Sự kiện nhật ký không hợp lệ: ' || coalesce(p_su_kien, ''));
  END IF;
  v_ns := public.fn_cssd_me_nguoi_thao_tac(p_actor_user_id);
  IF v_ns IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Tài khoản chưa gắn hồ sơ nhân sự — không ghi được người thao tác.');
  END IF;
  PERFORM public.fn_cssd_nhat_ky_them(p_quy_trinh_id, p_su_kien, p_tram, v_ns, p_nguon, p_chi_tiet);
  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb, uuid) TO authenticated, service_role;

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước và sau khi apply:
--   SELECT oid::regprocedure FROM pg_proc WHERE proname = 'rpc_cssd_nhat_ky_ghi';
--     trước: rpc_cssd_nhat_ky_ghi(uuid,text,text,text,jsonb) · sau: ...(uuid,text,text,text,jsonb,uuid) (chỉ 1 dòng)
--   SELECT grantee FROM information_schema.routine_privileges WHERE routine_name = 'rpc_cssd_nhat_ky_ghi' ORDER BY 1;
--     sau: authenticated, postgres, service_role (không anon/PUBLIC)
--   SELECT oid::regprocedure FROM pg_proc WHERE proname IN ('fn_cssd_me_nguoi_thao_tac','fn_cssd_nhat_ky_them');  -- phải có cả 2
