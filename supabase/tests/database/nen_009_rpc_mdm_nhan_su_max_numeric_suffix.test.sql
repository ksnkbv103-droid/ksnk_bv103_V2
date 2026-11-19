-- pgTAP · NEN-009: rpc_mdm_nhan_su_max_numeric_suffix chỉ cho phiên đăng nhập (authenticated) và service_role; anon không có EXECUTE.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < file (hoặc `supabase test db`). Dữ liệu không lưu (ROLLBACK).
-- @dac-ta: sổ lỗi NEN-009; ADR docs/adr/20261119-nen-009-revoke-anon-max-numeric-suffix.md; migration 20261119200000.
-- Hai nơi gọi: nhan-su-read.actions.ts (authenticated), account-access-request.actions.ts (service_role).
begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(3);

select is(has_function_privilege('anon', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'), false, 'NEN-009: anon không còn EXECUTE rpc_mdm_nhan_su_max_numeric_suffix');
select is(has_function_privilege('authenticated', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'), true, 'NEN-009: authenticated vẫn EXECUTE (nhan-su-read)');
select is(has_function_privilege('service_role', 'public.rpc_mdm_nhan_su_max_numeric_suffix(text)', 'EXECUTE'), true, 'NEN-009: service_role vẫn EXECUTE (account-access-request)');

select * from finish(true);
rollback;
