-- D-13: DROP legacy dashboard RPC (app chỉ dùng strategic v4 + staff stats — rpc-contract-dashboard.spec.ts).

BEGIN;

DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard(date, date, text[], uuid[], uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_multi_v1(date, date, text[], uuid[], uuid[], uuid[], uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_multi_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v2(date, date, text[], uuid[], uuid[], uuid[], uuid[], text);
DROP FUNCTION IF EXISTS public.rpc_get_dashboard_summary_table(date, date, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.rpc_get_dashboard_khoa_overview_rows(date, date, uuid[], uuid[], uuid[], uuid[]);

DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard(date, date, uuid[]);
DROP FUNCTION IF EXISTS public.rpc_get_vst_dashboard_v2(date, date, uuid[], uuid[], uuid[], uuid[], text, text);
DROP FUNCTION IF EXISTS public.rpc_get_vst_moment_table_only(date, date, uuid[], uuid[], uuid[], uuid[], text, text);

NOTIFY pgrst, 'reload schema';

COMMIT;
