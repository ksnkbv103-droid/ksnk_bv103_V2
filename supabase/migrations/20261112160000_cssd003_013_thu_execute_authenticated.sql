-- CSSD-003 + CSSD-013: thu EXECUTE của `authenticated` trên 5 hàm SECURITY DEFINER của CSSD.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- Căn cứ (DB local + mã, 2026-11-12):
--   - 4 RPC mẻ/nhật ký: mọi chỗ gọi trong src/ đều nằm ở module cssd-erp và dùng admin client (service_role).
--   - fn_cssd_operator_nhan_su_id: chỉ được gọi bên trong rpc_scan_workflow_station_impl và
--     fn_cssd_me_nguoi_thao_tac (đều SECURITY DEFINER, chạy quyền chủ hàm); không policy/view nào dùng.
--   - anon vốn không có EXECUTE; service_role giữ nguyên.
-- Ảnh hưởng: người đăng nhập gọi thẳng PostgREST /rpc/<hàm> sẽ nhận lỗi không đủ quyền. Ứng dụng không đổi.
--
-- Khôi phục (rollback): GRANT EXECUTE ON FUNCTION <từng hàm bên dưới> TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rpc_cssd_me_ghi_test(uuid, text, text, jsonb, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_cssd_me_ket_thuc_nap(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_cssd_me_ket_thuc_tiet_khuan(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_cssd_nhat_ky_ghi(uuid, text, text, text, jsonb, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_cssd_operator_nhan_su_id(text) FROM authenticated;

-- SQL kiểm prod (CHỈ ĐỌC), chạy trước/sau khi áp — sau khi áp cột authenticated phải là f, service_role là t:
--   SELECT p.oid::regprocedure,
--          has_function_privilege('authenticated', p.oid, 'execute') AS authenticated,
--          has_function_privilege('anon', p.oid, 'execute') AS anon,
--          has_function_privilege('service_role', p.oid, 'execute') AS service_role
--     FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace
--      AND p.proname IN ('rpc_cssd_me_ghi_test','rpc_cssd_me_ket_thuc_nap','rpc_cssd_me_ket_thuc_tiet_khuan',
--                        'rpc_cssd_nhat_ky_ghi','fn_cssd_operator_nhan_su_id');
