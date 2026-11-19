-- pgTAP · CSSD-042: RLS public.cssd_dm_loai_bao_goi dùng module BO_DC (đọc view, ghi edit), không còn 'CSSD'.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < file (hoặc `supabase test db`). Dữ liệu không lưu (ROLLBACK).
-- Hàm tests.authenticate_as cùng mẫu vst_rls.test.sql.
begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;
create function tests.authenticate_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function tests.authenticate_as(uuid) to anon, authenticated;

select plan(9);

-- ── Cấu trúc policy ──────────────────────────────────────────────────────────
select is(
  (select count(*)::int from pg_policies
    where tablename = 'cssd_dm_loai_bao_goi'
      and (coalesce(qual, '') like '%''CSSD''%' or coalesce(with_check, '') like '%''CSSD''%')),
  0, 'không policy nào còn module ''CSSD''');

select ok(
  (select qual like '%''BO_DC''%' and qual like '%''view''%' from pg_policies
    where tablename = 'cssd_dm_loai_bao_goi' and policyname = 'cssd_dm_loai_bao_goi_select'),
  'policy select dùng BO_DC:view');

select ok(
  (select qual like '%''BO_DC''%' and qual like '%''edit''%'
      and with_check like '%''BO_DC''%' and with_check like '%''edit''%'
     from pg_policies
    where tablename = 'cssd_dm_loai_bao_goi' and policyname = 'cssd_dm_loai_bao_goi_write'),
  'policy write dùng BO_DC:edit cho USING và WITH CHECK');

-- ── Dữ liệu thử ──────────────────────────────────────────────────────────────
-- user 1 ADMIN · 2 NHAN_VIEN_KSNK (BO_DC view, không edit) · 3 không vai
insert into auth.users (id, email)
select ('00000000-0000-4000-8000-0000000420b' || n)::uuid, 'rls-cssd042-' || n || '@example.test' from generate_series(1, 3) n;

insert into mdm_nhan_su (id, ho_ten, ma_nv, is_active, auth_user_id)
select ('00000000-0000-4000-8000-0000000420c' || n)::uuid, 'Người thử CSSD-042 ' || n, 'T_C042_' || n, true,
       ('00000000-0000-4000-8000-0000000420b' || n)::uuid
from generate_series(1, 3) n;

insert into sys_user_roles (user_id, role_id)
select ('00000000-0000-4000-8000-0000000420b' || m.n)::uuid, r.id
from (values (1, 'ADMIN'), (2, 'NHAN_VIEN_KSNK')) m(n, ten)
join sys_roles r on r.name = m.ten;

insert into public.cssd_dm_loai_bao_goi (id, ma, ten, so_ngay_han_dung)
values ('00000000-0000-4000-8000-0000000420d1', 'T_C042', 'Loại bao gói thử CSSD-042', 7);

-- ── Hành vi ──────────────────────────────────────────────────────────────────
select tests.authenticate_as('00000000-0000-4000-8000-0000000420b2');
select is(
  (select count(*)::int from public.cssd_dm_loai_bao_goi where ma = 'T_C042'),
  1, 'NHAN_VIEN_KSNK (BO_DC view) đọc được');

select throws_ok(
  $$insert into public.cssd_dm_loai_bao_goi (ma, ten) values ('T_C042_X', 'x')$$,
  '42501', null, 'NHAN_VIEN_KSNK (không BO_DC edit) không thêm được');

select is_empty(
  $$update public.cssd_dm_loai_bao_goi set ten = 'sửa' where ma = 'T_C042' returning id$$,
  'NHAN_VIEN_KSNK không sửa được (0 dòng)');

select tests.authenticate_as('00000000-0000-4000-8000-0000000420b3');
select is(
  (select count(*)::int from public.cssd_dm_loai_bao_goi),
  0, 'người không vai thấy 0 dòng');

select tests.authenticate_as('00000000-0000-4000-8000-0000000420b1');
select lives_ok(
  $$insert into public.cssd_dm_loai_bao_goi (ma, ten) values ('T_C042_ADMIN', 'admin thêm')$$,
  'ADMIN thêm được');

reset role;
select is(
  (select relacl::text from pg_class where oid = 'public.cssd_dm_loai_bao_goi'::regclass),
  '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}',
  'GRANT bảng không đổi');

select * from finish(true);
rollback;
