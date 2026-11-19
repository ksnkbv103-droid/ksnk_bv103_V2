-- pgTAP · VST-037: bảng kế hoạch giám sát chỉ ghi qua service_role; authenticated chỉ đọc.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < file (hoặc `supabase test db`). Dữ liệu không lưu (ROLLBACK).
-- @dac-ta: khóa PO 2026-11-01 (kế hoạch giám sát khoa/tháng); action chỉ cho ADMIN/NHAN_VIEN_KSNK (ke-hoach-giam-sat.actions.ts).
begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(6);

select is(
  (select count(*)::int from pg_policy
    where polrelid = 'public.gstt_fact_ke_hoach_giam_sat'::regclass and polcmd in ('a', 'w')),
  0, 'không còn policy INSERT/UPDATE trên gstt_fact_ke_hoach_giam_sat');
select is(has_table_privilege('authenticated', 'public.gstt_fact_ke_hoach_giam_sat', 'INSERT'), false, 'authenticated không còn INSERT');
select is(has_table_privilege('authenticated', 'public.gstt_fact_ke_hoach_giam_sat', 'UPDATE'), false, 'authenticated không còn UPDATE');
select is(has_table_privilege('authenticated', 'public.gstt_fact_ke_hoach_giam_sat', 'SELECT'), true, 'authenticated vẫn đọc được (policy select theo khoa/quyền)');
select is(
  has_table_privilege('service_role', 'public.gstt_fact_ke_hoach_giam_sat', 'INSERT')
  and has_table_privilege('service_role', 'public.gstt_fact_ke_hoach_giam_sat', 'UPDATE'),
  true, 'service_role vẫn ghi được (action setKeHoachKhoa)');

set local role authenticated;
select throws_ok(
  $$insert into public.gstt_fact_ke_hoach_giam_sat (khoa_id, thang, loai, is_active)
    values ('00000000-0000-4000-8000-000000000001', '2026-11-01', 'VST', true)$$,
  '42501', 'permission denied for table gstt_fact_ke_hoach_giam_sat', 'authenticated ghi trực tiếp bị từ chối ở mức quyền bảng (không phải chỉ RLS)');
reset role;

select * from finish(true);
rollback;
