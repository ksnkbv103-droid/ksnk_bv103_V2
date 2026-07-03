-- Wave 2 S-RPC-01: DROP RPC không còn caller app (analytics reform + BK reorder in TS).

DROP FUNCTION IF EXISTS public.rpc_get_compliance_dashboard_v4(date, date, uuid);
DROP FUNCTION IF EXISTS public.rpc_reorder_tieu_chi_bang_kiem(uuid);
