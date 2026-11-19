-- pgTAP · CSSD-039: phiếu XUẤT kho hóa chất không được gắn sự cố đã vô hiệu; hủy sự cố kiểm lại phiếu kho dưới khóa.
-- Chạy: `docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/database/cssd_039_khoa_su_co.test.sql`
--   hoặc `supabase test db`. Dữ liệu dựng trong giao dịch rồi ROLLBACK, không để lại gì. finish(true): có ca fail thì lỗi (exit ≠ 0).
-- Migration: supabase/migrations/20261119110000_cssd_039_khoa_su_co_ghi_giao_dich.sql
-- Quy tắc hủy (app, void-incident.application.ts): phiếu kho is_active và trang_thai <> 'TU_CHOI' chặn hủy,
-- trừ khi có phiếu ngược (phieu_goc_id, CSSD-034) DA_DUYET còn hiệu lực. Ca đua (2 phiên) không chứng minh được bằng pgTAP.
-- Hai RPC chỉ cấp EXECUTE cho service_role → gọi dưới role service_role, claim role = service_role (fn_cssd_assert_ledger_write).
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Dữ liệu dựng (postgres, bỏ qua RLS).
insert into public.cssd_dm_hoa_chat (id, ma_hoa_chat, ten_hoa_chat)
values ('00000000-0000-0000-0039-000000000001', 'T039', 'Hóa chất thử CSSD-039');
-- Tồn đầu kỳ: NHẬP đã duyệt, lô không mã/không hạn.
insert into public.cssd_fact_kho_hoa_chat_giao_dich (ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai)
values ('T039-NK', '00000000-0000-0000-0039-000000000001', 'NHAP', 100, 'DA_DUYET');

insert into public.cssd_fact_su_co (id, ma_tram_phat_hien, is_active) values
  ('00000000-0000-0000-0039-0000000000a1', 'T039', false),  -- đã vô hiệu
  ('00000000-0000-0000-0039-0000000000a2', 'T039', true),   -- còn hiệu lực, chưa có phiếu
  ('00000000-0000-0000-0039-0000000000a3', 'T039', true),   -- có phiếu XUẤT CHO_DUYET
  ('00000000-0000-0000-0039-0000000000a4', 'T039', true),   -- phiếu XUẤT DA_DUYET + phiếu ngược DA_DUYET
  ('00000000-0000-0000-0039-0000000000a5', 'T039', true);   -- phiếu XUẤT DA_DUYET + phiếu ngược mới CHO_DUYET

insert into public.cssd_fact_kho_hoa_chat_giao_dich
  (id, ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai, su_co_id, ly_do_xuat)
values
  ('00000000-0000-0000-0039-0000000000b3', 'T039-XK3', '00000000-0000-0000-0039-000000000001', 'XUAT', -1, 'CHO_DUYET',
   '00000000-0000-0000-0039-0000000000a3', 'CAP_SU_DUNG'),
  ('00000000-0000-0000-0039-0000000000b4', 'T039-XK4', '00000000-0000-0000-0039-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0039-0000000000a4', 'CAP_SU_DUNG'),
  ('00000000-0000-0000-0039-0000000000b5', 'T039-XK5', '00000000-0000-0000-0039-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0039-0000000000a5', 'CAP_SU_DUNG');
-- Phiếu ngược: NHẬP, su_co_id NULL (CHECK cssd_fact_kho_hc_phieu_nguoc_check), trỏ phiếu gốc.
insert into public.cssd_fact_kho_hoa_chat_giao_dich
  (ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai, phieu_goc_id, ly_do_dao)
values
  ('T039-NG4', '00000000-0000-0000-0039-000000000001', 'NHAP', 1, 'DA_DUYET', '00000000-0000-0000-0039-0000000000b4', 'thử'),
  ('T039-NG5', '00000000-0000-0000-0039-000000000001', 'NHAP', 1, 'CHO_DUYET', '00000000-0000-0000-0039-0000000000b5', 'thử');

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

-- (a) ghi_giao_dich
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0039-000000000001', 1, null, null, null,
      '00000000-0000-0000-0039-0000000000a1', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố không tồn tại hoặc đã bị vô hiệu. Không lập phiếu xuất kho hóa chất cho sự cố này.',
  'XUẤT gắn sự cố đã vô hiệu bị chặn');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0039-000000000001', 1, null, null, null,
      '00000000-0000-0000-0039-0000000000ff', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố không tồn tại hoặc đã bị vô hiệu. Không lập phiếu xuất kho hóa chất cho sự cố này.',
  'XUẤT gắn sự cố không tồn tại bị chặn bằng thông điệp tiếng Việt (không phải lỗi FK)');
select lives_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0039-000000000001', 1, null, null, null,
      '00000000-0000-0000-0039-0000000000a2', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'XUẤT gắn sự cố còn hiệu lực lập được');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0039-000000000001', 1, null, null, null,
      '00000000-0000-0000-0039-0000000000a2', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'CSSD-032 giữ nguyên: phiếu thứ hai cho cùng sự cố bị chặn');

-- (b) apply_incident_void
select throws_ok(
  $$select public.rpc_cssd_apply_incident_void('00000000-0000-0000-0039-0000000000a3', '{}'::jsonb, null, null, null, null, null, null, null)$$,
  'P0001',
  'Đã ghi xuất kho hóa chất theo phiếu này. Từ chối phiếu chưa duyệt, hoặc lập phiếu ngược cho phiếu đã duyệt và chờ duyệt xong, rồi mới vô hiệu.',
  'Hủy sự cố có phiếu XUẤT CHO_DUYET bị chặn');
select throws_ok(
  $$select public.rpc_cssd_apply_incident_void('00000000-0000-0000-0039-0000000000a5', '{}'::jsonb, null, null, null, null, null, null, null)$$,
  'P0001',
  'Đã ghi xuất kho hóa chất theo phiếu này. Từ chối phiếu chưa duyệt, hoặc lập phiếu ngược cho phiếu đã duyệt và chờ duyệt xong, rồi mới vô hiệu.',
  'Hủy sự cố có phiếu DA_DUYET mà phiếu ngược mới CHO_DUYET bị chặn');
select is(
  public.rpc_cssd_apply_incident_void('00000000-0000-0000-0039-0000000000a4', '{}'::jsonb, null, null, null, null, null, null, null),
  '{"already": false}'::jsonb,
  'Hủy sự cố có phiếu DA_DUYET + phiếu ngược DA_DUYET vẫn qua');

reset role;
select is(
  (select is_active from public.cssd_fact_su_co where id = '00000000-0000-0000-0039-0000000000a4'),
  false,
  'Sự cố đã đảo hết phiếu được vô hiệu thật');

select * from finish(true);
rollback;
