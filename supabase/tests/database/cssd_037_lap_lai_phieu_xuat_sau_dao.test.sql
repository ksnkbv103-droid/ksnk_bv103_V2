-- pgTAP · CSSD-037: sự cố đã đảo hết phiếu XUẤT hóa chất được lập lại phiếu XUẤT; phiếu ngược của lô hết hạn có ghi chú cảnh báo.
-- Chạy: `docker exec -i supabase_db_ksnk_bv103 psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/database/cssd_037_lap_lai_phieu_xuat_sau_dao.test.sql`
--   hoặc `supabase test db`. Dữ liệu dựng trong giao dịch rồi ROLLBACK, không để lại gì. finish(true): có ca fail thì lỗi (exit ≠ 0).
-- Migration: supabase/migrations/20261119140000_cssd_037_lap_lai_phieu_xuat_sau_dao.sql
-- Quy tắc «đã đảo hết» (cùng rpc_cssd_apply_incident_void, CSSD-039): có phiếu ngược (phieu_goc_id) DA_DUYET và is_active.
-- Phiếu ngược CHO_DUYET / TU_CHOI / đã vô hiệu thì sự cố vẫn bị coi «đã có phiếu». Ca đua (2 phiên) không chứng minh được bằng pgTAP.
-- Hai RPC chỉ cấp EXECUTE cho service_role → gọi dưới role service_role, claim role = service_role (fn_cssd_assert_ledger_write).
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Dữ liệu dựng (postgres, bỏ qua RLS).
insert into public.cssd_dm_hoa_chat (id, ma_hoa_chat, ten_hoa_chat)
values ('00000000-0000-0000-0037-000000000001', 'T037', 'Hóa chất thử CSSD-037');
-- Tồn đầu kỳ: NHẬP đã duyệt, lô không mã/không hạn.
insert into public.cssd_fact_kho_hoa_chat_giao_dich (ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai)
values ('T037-NK', '00000000-0000-0000-0037-000000000001', 'NHAP', 100, 'DA_DUYET');

insert into public.cssd_fact_su_co (id, ma_tram_phat_hien, is_active) values
  ('00000000-0000-0000-0037-0000000000a1', 'T037', true),  -- XUẤT DA_DUYET + ngược DA_DUYET (đã đảo hết)
  ('00000000-0000-0000-0037-0000000000a2', 'T037', true),  -- XUẤT DA_DUYET + ngược CHO_DUYET
  ('00000000-0000-0000-0037-0000000000a3', 'T037', true),  -- XUẤT DA_DUYET, chưa có ngược
  ('00000000-0000-0000-0037-0000000000a4', 'T037', true),  -- XUẤT DA_DUYET + ngược TU_CHOI
  ('00000000-0000-0000-0037-0000000000a5', 'T037', true),  -- XUẤT DA_DUYET + ngược DA_DUYET nhưng đã vô hiệu
  ('00000000-0000-0000-0037-0000000000a6', 'T037', true),  -- XUẤT HET_HAN_HUY DA_DUYET (thử ghi chú phiếu ngược)
  ('00000000-0000-0000-0037-0000000000a7', 'T037', true);  -- XUẤT CAP_SU_DUNG DA_DUYET (thử ghi chú phiếu ngược thường)

insert into public.cssd_fact_kho_hoa_chat_giao_dich
  (id, ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai, su_co_id, ly_do_xuat, ma_lo, han_su_dung)
values
  ('00000000-0000-0000-0037-0000000000b1', 'T037-XK1', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a1', 'CAP_SU_DUNG', null, null),
  ('00000000-0000-0000-0037-0000000000b2', 'T037-XK2', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a2', 'CAP_SU_DUNG', null, null),
  ('00000000-0000-0000-0037-0000000000b3', 'T037-XK3', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a3', 'CAP_SU_DUNG', null, null),
  ('00000000-0000-0000-0037-0000000000b4', 'T037-XK4', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a4', 'CAP_SU_DUNG', null, null),
  ('00000000-0000-0000-0037-0000000000b5', 'T037-XK5', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a5', 'CAP_SU_DUNG', null, null),
  ('00000000-0000-0000-0037-0000000000b6', 'T037-XK6', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a6', 'HET_HAN_HUY', 'T037-LO', date '2020-01-01'),
  ('00000000-0000-0000-0037-0000000000b7', 'T037-XK7', '00000000-0000-0000-0037-000000000001', 'XUAT', -1, 'DA_DUYET',
   '00000000-0000-0000-0037-0000000000a7', 'CAP_SU_DUNG', null, null);
-- Phiếu ngược: NHẬP, su_co_id NULL (CHECK cssd_fact_kho_hc_phieu_nguoc_check), trỏ phiếu gốc.
insert into public.cssd_fact_kho_hoa_chat_giao_dich
  (ma_phieu, dm_hoa_chat_id, loai_giao_dich, so_luong_co_dau, trang_thai, phieu_goc_id, ly_do_dao, is_active, ly_do_tu_choi)
values
  ('T037-NG1', '00000000-0000-0000-0037-000000000001', 'NHAP', 1, 'DA_DUYET', '00000000-0000-0000-0037-0000000000b1', 'thử', true, null),
  ('T037-NG2', '00000000-0000-0000-0037-000000000001', 'NHAP', 1, 'CHO_DUYET', '00000000-0000-0000-0037-0000000000b2', 'thử', true, null),
  ('T037-NG4', '00000000-0000-0000-0037-000000000001', 'NHAP', 1, 'TU_CHOI', '00000000-0000-0000-0037-0000000000b4', 'thử', true, 'thử'),
  ('T037-NG5', '00000000-0000-0000-0037-000000000001', 'NHAP', 1, 'DA_DUYET', '00000000-0000-0000-0037-0000000000b5', 'thử', false, null);

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

-- (a) ghi_giao_dich: vị từ chặn phiếu XUẤT thứ hai
select lives_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a1', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'Sự cố đã đảo hết (phiếu ngược DA_DUYET còn hiệu lực) lập lại được phiếu XUẤT');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a1', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'Phiếu XUẤT mới (CHO_DUYET, chưa đảo) lại chặn phiếu thứ ba');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a2', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'Phiếu ngược còn CHO_DUYET (chưa đảo xong) vẫn chặn');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a3', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'CSSD-032 giữ nguyên: phiếu XUẤT DA_DUYET chưa đảo vẫn chặn');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a4', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'Phiếu ngược TU_CHOI (không đảo được) vẫn chặn');
select throws_ok(
  $$select public.rpc_cssd_kho_hoa_chat_ghi_giao_dich('XUAT', '00000000-0000-0000-0037-000000000001', 1, null, null, null,
      '00000000-0000-0000-0037-0000000000a5', gen_random_uuid(), null, 'CAP_SU_DUNG')$$,
  'P0001',
  'Sự cố này đã có phiếu xuất kho hóa chất (chưa bị từ chối). Không lập phiếu thứ hai.',
  'Phiếu ngược DA_DUYET nhưng đã vô hiệu (is_active = false) vẫn chặn');

-- (b) lap_phieu_nguoc: ghi chú cảnh báo lô hết hạn
select lives_ok(
  $$select public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc('00000000-0000-0000-0037-0000000000b6', 'thử', gen_random_uuid())$$,
  'Lập phiếu ngược cho phiếu gốc HET_HAN_HUY');
select lives_ok(
  $$select public.rpc_cssd_kho_hoa_chat_lap_phieu_nguoc('00000000-0000-0000-0037-0000000000b7', 'thử', gen_random_uuid())$$,
  'Lập phiếu ngược cho phiếu gốc CAP_SU_DUNG');

reset role;
select is(
  (select string_agg(ghi_chu, ' | ' order by ghi_chu) from public.cssd_fact_kho_hoa_chat_giao_dich
    where phieu_goc_id in ('00000000-0000-0000-0037-0000000000b6', '00000000-0000-0000-0037-0000000000b7')),
  'Phiếu ngược của T037-XK6. Lưu ý: phiếu gốc xuất hủy lô hết hạn (HSD 01/01/2020); duyệt phiếu ngược sẽ cộng lại tồn lô đã quá hạn, không dùng lô này để cấp. | Phiếu ngược của T037-XK7',
  'Ghi chú phiếu ngược: lô hết hạn có cảnh báo + HSD, phiếu thường giữ nguyên «Phiếu ngược của …»');

select * from finish(true);
rollback;
