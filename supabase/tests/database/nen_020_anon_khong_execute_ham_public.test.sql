-- pgTAP · NEN-020 (gộp NEN-018): không còn hàm public owner postgres nào cho anon EXECUTE; authenticated + service_role vẫn gọi được 35 hàm đã thu.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < file (hoặc `supabase test db`). Dữ liệu không lưu (ROLLBACK).
-- @dac-ta: sổ lỗi NEN-020, NEN-018; ADR docs/adr/20261119-nen-020-revoke-anon-public-execute-35-ham.md; migration 20261119210000.
begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(5);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and pg_get_userbyid(p.proowner) = 'postgres'
      and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'NEN-020: anon không còn EXECUTE hàm public owner postgres');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and pg_get_userbyid(p.proowner) = 'postgres'
      and p.proacl is not null and exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')),
  0, 'NEN-020: không còn hàm public owner postgres cấp EXECUTE cho PUBLIC');

select is(
  (select count(*)::int from unnest(array[
      'public.rpc_dm_bang_kiem_max_numeric_suffix(text)',
      'public.rpc_gstt_dm_bang_kiem_max_numeric_suffix(text)']) s
    where has_function_privilege('anon', s, 'EXECUTE')),
  0, 'NEN-018: hai hàm max_numeric_suffix của bảng kiểm không còn EXECUTE cho anon');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and pg_get_userbyid(p.proowner) = 'postgres'
      and p.proname in ('rpc_qlcv_board_counts','rpc_gsc_tgs_session_hits','rpc_get_compliance_dashboard_v4',
                        'fn_nkbv_ba_hub','fn_nkbv_ba_keys_chua_phan_tich','mdm_refresh_governance_suggestions',
                        'rpc_gstt_dm_bang_kiem_max_numeric_suffix')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0, 'NEN-020: authenticated vẫn EXECUTE các RPC có nơi gọi trong src/');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and pg_get_userbyid(p.proowner) = 'postgres'
      and p.proname in ('mdm_refresh_governance_suggestions','rpc_gstt_dm_bang_kiem_max_numeric_suffix','fn_sys_attach_admin_rls')
      and not has_function_privilege('service_role', p.oid, 'EXECUTE')),
  0, 'NEN-020: service_role vẫn EXECUTE các hàm script/server gọi bằng service key');

select * from finish(true);
rollback;
