-- pgTAP · CSSD-045: rpc_get_registry_options nhánh LOAI_DUNG_CU đọc ten_loai/ma_loai, giữ shape {id, ten, ma}.
-- Chạy: docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < file (hoặc `supabase test db`). Dữ liệu không lưu (ROLLBACK).
begin;

create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(8);

-- Dữ liệu thử: một loại hoạt động, một loại ngừng.
insert into public.cssd_dm_loai_dung_cu (id, ma_loai, ten_loai, is_active, phuong_phap_cho_phep) values
  ('00000000-0000-4000-8000-0000000c0451', 'T045_ACTIVE', 'T045 loại hoạt động', true, array['STEAM_134']),
  ('00000000-0000-4000-8000-0000000c0452', 'T045_INACTIVE', 'T045 loại ngừng', false, array['STEAM_134']);

select lives_ok(
  $$select public.rpc_get_registry_options(array['LOAI_DUNG_CU'])$$,
  'LOAI_DUNG_CU không còn lỗi 42703');

select is(
  (select count(*)::int
     from json_array_elements(public.rpc_get_registry_options(array['LOAI_DUNG_CU']) -> 'LOAI_DUNG_CU') e
    where not (e::jsonb ?& array['id', 'ten', 'ma'])),
  0, 'mọi phần tử LOAI_DUNG_CU có đủ id, ten, ma');

select is(
  (select count(*)::int
     from json_array_elements(public.rpc_get_registry_options(array['LOAI_DUNG_CU']) -> 'LOAI_DUNG_CU') e),
  (select count(*)::int from public.cssd_dm_loai_dung_cu where is_active),
  'số phần tử = số loại is_active = true');

select is(
  (select e ->> 'ten'
     from json_array_elements(public.rpc_get_registry_options(array['LOAI_DUNG_CU']) -> 'LOAI_DUNG_CU') e
    where e ->> 'ma' = 'T045_ACTIVE'),
  'T045 loại hoạt động', 'ten = ten_loai, ma = ma_loai');

select is(
  (select count(*)::int
     from json_array_elements(public.rpc_get_registry_options(array['LOAI_DUNG_CU']) -> 'LOAI_DUNG_CU') e
    where e ->> 'ma' = 'T045_INACTIVE'),
  0, 'loại is_active = false không xuất hiện');

select is(
  (select count(*)::int
     from json_array_elements(public.rpc_get_registry_options(array['KHOA_PHONG']) -> 'KHOA_PHONG') e),
  (select count(*)::int from public.mdm_dm_khoa_phong where is_active),
  'nhánh KHOA_PHONG không đổi (số phần tử = khoa is_active)');

select ok(
  (select public.rpc_get_registry_options(array['KHOA_PHONG', 'LOAI_DUNG_CU', 'BO_DUNG_CU'])::jsonb
     ?& array['KHOA_PHONG', 'LOAI_DUNG_CU', 'BO_DUNG_CU']),
  'gọi gộp nhiều danh mục trả đủ khóa');

select is(
  (select proacl::text from pg_proc where oid = 'public.rpc_get_registry_options'::regproc),
  '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}',
  'ACL hàm không đổi (anon không gọi được)');

select * from finish(true);
rollback;
