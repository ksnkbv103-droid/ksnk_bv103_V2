-- pgTAP · RLS của phiên VST (gstt_fact_vst_sessions, gstt_fact_vst): cho/chặn theo từng vai.
-- Chạy: `supabase test db` (có trong `npm run db:dung`). Dữ liệu dựng trong giao dịch rồi ROLLBACK, không để lại gì.
-- Plan .claude/plans/de-xuat-mot-con-duong-20261119.md §10 #1 (Lát 1b).
-- @dac-ta: khóa PO 2026-11-01 (giám sát) và CLAUDE.md «Khóa PO»: xóa phiên VST là xóa mềm (is_active=false) nên vai thường không thấy phiên đã xóa.
-- Chính sách đọc (migration 20261111180000 trở đi): ADMIN thấy hết; còn lại cần quyền GIAM_SAT_VST:view, phiên is_active,
-- không phải KHACH_THONG_KE_GSTT; NHAN_VIEN_KSNK / CHU_NHIEM_KHOA thấy mọi phiên; MANG_LUOI_KSNK chỉ phiên của mình hoặc cùng khoa;
-- HOI_DONG_KSNK không thấy; LANH_DAO_KHOA (20261119150000) chỉ phiên khoa mình. Ghi trực tiếp vào bảng chỉ ADMIN (policy «Admin full access»); vai khác phải qua RPC.
-- Hàm tests.authenticate_as mượn ý usebasejump/supabase-test-helpers (MIT), rút gọn, dựng trong giao dịch.
begin;

create extension if not exists pgtap with schema extensions;

create schema tests;
grant usage on schema tests to anon, authenticated;
create function tests.authenticate_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on function tests.authenticate_as(uuid) to anon, authenticated;
-- Số dòng một lệnh UPDATE/DELETE tác động (CTE ghi dữ liệu không đặt được trong select is(...)).
create function tests.rows_affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function tests.rows_affected(text) to anon, authenticated;

select plan(33);

-- ── Dữ liệu thử ──────────────────────────────────────────────────────────────
insert into mdm_dm_khoa_phong (id, ma_khoa, ten_khoa)
values ('00000000-0000-4000-8000-0000000000a1', 'T_RLS_K1', 'Khoa thử RLS 1'),
       ('00000000-0000-4000-8000-0000000000a2', 'T_RLS_K2', 'Khoa thử RLS 2');

-- id user: 1 admin · 2 NHAN_VIEN_KSNK · 3 MANG_LUOI_KSNK (khoa 1) · 4 KHACH_THONG_KE_GSTT · 5 HOI_DONG_KSNK · 6 không vai
-- · 7 LANH_DAO_KHOA (khoa 2) · 8 LANH_DAO_KHOA chưa gắn khoa · 9 LANH_DAO_KHOA + NHAN_VIEN_KSNK (khoa 2) — VST-028
insert into auth.users (id, email)
select ('00000000-0000-4000-8000-0000000000b' || n)::uuid, 'rls-vst-' || n || '@example.test' from generate_series(1, 9) n;

insert into mdm_nhan_su (id, ho_ten, ma_nv, khoa_id, is_active, auth_user_id)
select ('00000000-0000-4000-8000-0000000000c' || n)::uuid, 'Người thử RLS ' || n, 'T_RLS_' || n,
       case when n = 3 then '00000000-0000-4000-8000-0000000000a1'::uuid
            when n in (7, 9) then '00000000-0000-4000-8000-0000000000a2'::uuid end, true,
       ('00000000-0000-4000-8000-0000000000b' || n)::uuid
from generate_series(1, 9) n;

insert into sys_user_roles (user_id, role_id)
select ('00000000-0000-4000-8000-0000000000b' || m.n)::uuid, r.id
from (values (1, 'ADMIN'), (2, 'NHAN_VIEN_KSNK'), (3, 'MANG_LUOI_KSNK'), (4, 'KHACH_THONG_KE_GSTT'), (5, 'HOI_DONG_KSNK'),
             (7, 'LANH_DAO_KHOA'), (8, 'LANH_DAO_KHOA'), (9, 'LANH_DAO_KHOA'), (9, 'NHAN_VIEN_KSNK')) m(n, ten)
join sys_roles r on r.name = m.ten;

-- 3 phiên: S1 khoa 1 do người 3 giám sát · S2 khoa 2 không người giám sát · S3 khoa 1 đã xóa mềm
insert into gstt_fact_vst_sessions (id, khoa_id, nguoi_giam_sat_id, ngay_giam_sat, is_active)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c3', current_date, true),
       ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000a2', null, current_date, true),
       ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000a1', null, current_date, false);
-- Dòng quan sát: trigger MDM bắt buộc nghe_nghiep_id (lookup NGHE_NGHIEP, có trong supabase/seeds/02-reference-lookups.sql)
insert into gstt_fact_vst (session_id, nghe_nghiep_id)
select s.id, (select id from sys_lookup_value where category_type = 'NGHE_NGHIEP' and is_active limit 1)
from gstt_fact_vst_sessions s where s.id::text like '00000000-0000-4000-8000-0000000000d%';

-- ── Cấu trúc: RLS bật và đúng tập policy (thêm/bớt policy phải sửa test này có chủ đích) ──
select ok((select relrowsecurity from pg_class where oid = 'public.gstt_fact_vst_sessions'::regclass), 'gstt_fact_vst_sessions: RLS bật');
select ok((select relrowsecurity from pg_class where oid = 'public.gstt_fact_vst'::regclass), 'gstt_fact_vst: RLS bật');
select policies_are('public', 'gstt_fact_vst_sessions', array['Admin full access', 'vst_sessions_select_permission'], 'gstt_fact_vst_sessions: đúng 2 policy');
select policies_are('public', 'gstt_fact_vst', array['Admin full access', 'vst_obs_select_permission'], 'gstt_fact_vst: đúng 2 policy');
-- VST-028: vai LANH_DAO_KHOA tồn tại và chỉ có đúng quyền GIAM_SAT_VST:view
select is((select array_agg(p.module_name || ':' || p.action) from sys_role_permissions rp
             join sys_roles r on r.id = rp.role_id join sys_permissions p on p.id = rp.permission_id
            where r.name = 'LANH_DAO_KHOA' and r.is_active),
          array['GIAM_SAT_VST:view'], 'LANH_DAO_KHOA chỉ có quyền GIAM_SAT_VST:view');
-- VST-046: CHU_NHIEM_KHOA có quyền xem VST và GSC (liên kết do migration tạo, không dựa seed)
select ok(exists (select 1 from sys_role_permissions rp
                    join sys_roles r on r.id = rp.role_id join sys_permissions p on p.id = rp.permission_id
                   where r.name = 'CHU_NHIEM_KHOA' and p.module_name = 'GIAM_SAT_VST' and p.action = 'view'),
          'CHU_NHIEM_KHOA có quyền GIAM_SAT_VST:view');
select ok(exists (select 1 from sys_role_permissions rp
                    join sys_roles r on r.id = rp.role_id join sys_permissions p on p.id = rp.permission_id
                   where r.name = 'CHU_NHIEM_KHOA' and p.module_name = 'GIAM_SAT_CHUNG' and p.action = 'view'),
          'CHU_NHIEM_KHOA có quyền GIAM_SAT_CHUNG:view');
select is((select array_agg(p.module_name order by p.module_name)
             from sys_role_permissions rp
             join sys_roles r on r.id = rp.role_id join sys_permissions p on p.id = rp.permission_id
            where r.name = 'CHU_NHIEM_KHOA' and p.action = 'view'),
          array['BO_DC','DC_LE','GIAM_SAT_CHUNG','GIAM_SAT_VST','HOA_CHAT','LOAI_DC','THIET_BI'],
          'CHU_NHIEM_KHOA có đúng 7 quyền view (VST, GSC, 5 danh mục CSSD)');

-- ── Đọc theo vai ──
select tests.authenticate_as('00000000-0000-4000-8000-0000000000b1');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 3::bigint, 'ADMIN thấy cả 3 phiên (kể cả đã xóa mềm)');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 3::bigint, 'ADMIN thấy cả 3 dòng quan sát');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b2');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 2::bigint, 'NHAN_VIEN_KSNK thấy 2 phiên còn hiệu lực');
select is((select count(*) from gstt_fact_vst_sessions where id = '00000000-0000-4000-8000-0000000000d3'), 0::bigint, 'NHAN_VIEN_KSNK không thấy phiên đã xóa mềm');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 2::bigint, 'NHAN_VIEN_KSNK thấy 2 dòng quan sát của phiên còn hiệu lực');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b3');
select is((select array_agg(id) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), array['00000000-0000-4000-8000-0000000000d1']::uuid[], 'MANG_LUOI_KSNK chỉ thấy phiên của mình/cùng khoa (S1)');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 1::bigint, 'MANG_LUOI_KSNK chỉ thấy quan sát của S1');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b4');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'KHACH_THONG_KE_GSTT không thấy phiên nào');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b5');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'HOI_DONG_KSNK không thấy phiên nào');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b6');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'người không có vai không thấy phiên nào');
reset role;

-- VST-028: lãnh đạo khoa lâm sàng chỉ thấy phiên/quan sát của khoa mình
select tests.authenticate_as('00000000-0000-4000-8000-0000000000b7');
select is((select array_agg(id) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), array['00000000-0000-4000-8000-0000000000d2']::uuid[], 'LANH_DAO_KHOA khoa 2 chỉ thấy S2 (không S1 khoa 1, không S3)');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 1::bigint, 'LANH_DAO_KHOA khoa 2 thấy đúng 1 dòng quan sát');
select is((select array_agg(session_id) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), array['00000000-0000-4000-8000-0000000000d2']::uuid[], 'LANH_DAO_KHOA khoa 2: dòng quan sát thuộc S2');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b8');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'LANH_DAO_KHOA chưa gắn khoa không thấy phiên nào');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'LANH_DAO_KHOA chưa gắn khoa không thấy quan sát nào');
reset role;

select tests.authenticate_as('00000000-0000-4000-8000-0000000000b9');
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 2::bigint, 'LANH_DAO_KHOA + NHAN_VIEN_KSNK thấy toàn viện (2 phiên còn hiệu lực)');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 2::bigint, 'LANH_DAO_KHOA + NHAN_VIEN_KSNK thấy 2 dòng quan sát');
reset role;

set local role anon;
select is((select count(*) from gstt_fact_vst_sessions where id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'anon không thấy phiên nào');
select is((select count(*) from gstt_fact_vst where session_id::text like '00000000-0000-4000-8000-0000000000d%'), 0::bigint, 'anon không thấy dòng quan sát nào');
reset role;

-- ── Ghi trực tiếp: chỉ ADMIN; vai thường phải qua RPC (SECURITY DEFINER) ──
select tests.authenticate_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok(
  $$insert into gstt_fact_vst_sessions (khoa_id, ngay_giam_sat) values ('00000000-0000-4000-8000-0000000000a1', current_date)$$,
  '42501', null, 'NHAN_VIEN_KSNK không INSERT trực tiếp vào bảng phiên');
select is(tests.rows_affected($$update gstt_fact_vst_sessions set is_seen = true where id = '00000000-0000-4000-8000-0000000000d1'$$),
  0::bigint, 'NHAN_VIEN_KSNK không UPDATE trực tiếp phiên (0 dòng)');
select is(tests.rows_affected($$delete from gstt_fact_vst_sessions where id = '00000000-0000-4000-8000-0000000000d1'$$),
  0::bigint, 'NHAN_VIEN_KSNK không DELETE trực tiếp phiên (0 dòng)');
reset role;

-- VST-028: LANH_DAO_KHOA chỉ xem; không ghi trực tiếp kể cả phiên mình thấy được (S2)
select tests.authenticate_as('00000000-0000-4000-8000-0000000000b7');
select throws_ok(
  $$insert into gstt_fact_vst_sessions (khoa_id, ngay_giam_sat) values ('00000000-0000-4000-8000-0000000000a2', current_date)$$,
  '42501', null, 'LANH_DAO_KHOA không INSERT trực tiếp vào bảng phiên');
select is(tests.rows_affected($$update gstt_fact_vst_sessions set is_seen = true where id = '00000000-0000-4000-8000-0000000000d2'$$),
  0::bigint, 'LANH_DAO_KHOA không UPDATE trực tiếp phiên khoa mình (0 dòng)');
select is(tests.rows_affected($$delete from gstt_fact_vst_sessions where id = '00000000-0000-4000-8000-0000000000d2'$$),
  0::bigint, 'LANH_DAO_KHOA không DELETE trực tiếp phiên khoa mình (0 dòng)');
reset role;

select * from finish();
rollback;
