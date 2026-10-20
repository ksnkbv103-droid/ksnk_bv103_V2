-- Siết GHI sổ kho dụng cụ CSSD (cssd_fact_kho_giao_dich) về admin-only.
-- CHƯA APPLY PROD — chờ PO. Local: `npm run mdm:migrate:local`.
--
-- Lỗi (security-auditor): 20260709130000 cho INSERT/UPDATE theo CSSD_KHO_DUNGCU 'edit', DELETE theo 'delete'
-- → user không phải ADMIN chèn dòng giả / UPDATE is_active=false giấu lịch sử, vòng qua khóa hàm ledger
-- của 20261012100000. Bảng không có trigger.
-- App: mọi ghi đi qua hàm DEFINER fn_cssd_*/rpc_* hoặc createAdminSupabaseClient (service_role) → đều bỏ qua RLS.
-- SELECT giữ nguyên (admin hoặc CSSD_KHO_DUNGCU 'view').
-- Grant: thu INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES của anon (không có policy anon);
--        thu TRUNCATE/TRIGGER/REFERENCES của authenticated (TRUNCATE không qua RLS).
--        Giữ INSERT/UPDATE/DELETE cho authenticated để policy admin-only còn tác dụng.

DROP POLICY IF EXISTS cssd_fact_kho_giao_dich_insert ON public.cssd_fact_kho_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_giao_dich_update ON public.cssd_fact_kho_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_giao_dich_delete ON public.cssd_fact_kho_giao_dich;

CREATE POLICY cssd_fact_kho_giao_dich_insert ON public.cssd_fact_kho_giao_dich
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

CREATE POLICY cssd_fact_kho_giao_dich_update ON public.cssd_fact_kho_giao_dich
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

CREATE POLICY cssd_fact_kho_giao_dich_delete ON public.cssd_fact_kho_giao_dich
  FOR DELETE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.cssd_fact_kho_giao_dich FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.cssd_fact_kho_giao_dich FROM authenticated;

-- SQL kiểm prod (chỉ đọc):
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr, pg_get_expr(polwithcheck, polrelid) AS check_expr
--   FROM pg_policy WHERE polrelid = 'public.cssd_fact_kho_giao_dich'::regclass ORDER BY polname;
-- SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'cssd_fact_kho_giao_dich' GROUP BY grantee;
