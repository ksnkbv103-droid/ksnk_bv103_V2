-- ADR: docs/adr/20261119-nen-009-revoke-anon-max-numeric-suffix.md
-- NEN-009: public.rpc_mdm_nhan_su_max_numeric_suffix(text) (SECURITY INVOKER, baseline 20260530000000) được GRANT ALL
-- cho anon và còn EXECUTE mặc định cho PUBLIC. anon không có SELECT mdm_nhan_su nên gọi chỉ lỗi quyền bảng, không lộ
-- dữ liệu; đây là siết quyền thừa. Hai nơi gọi (nhan-su-read.actions.ts, account-access-request.actions.ts) đều chạy
-- trong phiên đăng nhập.
-- Chỉ đổi quyền EXECUTE của đúng hàm này. Không đổi thân hàm, chữ ký, SECURITY, search_path. Idempotent.
-- Không BEGIN/COMMIT: db push tự bọc transaction.

REVOKE EXECUTE ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) TO authenticated, service_role;

-- Kiểm sau apply (kỳ vọng anon=f, authenticated=t, service_role=t; proacl không còn `=X` và `anon=X`):
--   SELECT has_function_privilege('anon', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'),
--          has_function_privilege('authenticated', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'),
--          has_function_privilege('service_role', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'),
--          (SELECT proacl FROM pg_proc WHERE oid = 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)'::regprocedure);
-- CHƯA APPLY PROD — chờ PO. SQL kiểm prod (chỉ đọc) trước khi áp: câu SELECT ở trên.
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.rpc_mdm_nhan_su_max_numeric_suffix(text) TO PUBLIC, anon;
