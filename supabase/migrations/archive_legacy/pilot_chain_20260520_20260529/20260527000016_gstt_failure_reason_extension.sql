-- Migration: Master failure_reason extension
-- Slice 6 (session-level RCA v5): bổ sung 4 cột metadata + 7 reason mới
-- để phủ hết kịch bản waste/CSSD/môi trường mà 21 reason hiện không có.
-- Date: 27/05/2026

begin;

-- ----------------------------------------------------
-- 1. Thêm 4 cột metadata cho master catalog
-- ----------------------------------------------------

alter table public.gstt_dm_failure_reason
  add column if not exists muc_do_canh_bao text not null default 'BINH_THUONG',
  add column if not exists mo_ta_canonical text,
  add column if not exists phong_ban_xu_ly_mac_dinh text,
  add column if not exists han_xu_ly_ngay_mac_dinh int not null default 45;

-- CHECK constraint cho 3 mức cảnh báo: BINH_THUONG / RCA / SENTINEL
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'chk_gstt_fr_muc_do_canh_bao'
  ) then
    alter table public.gstt_dm_failure_reason
      add constraint chk_gstt_fr_muc_do_canh_bao
      check (muc_do_canh_bao in ('BINH_THUONG','RCA','SENTINEL'));
  end if;
end$$;

-- CHECK cho phong_ban_xu_ly_mac_dinh: trùng tập của gstt_fact_rca_ticket.phong_ban_xu_ly
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'chk_gstt_fr_phong_ban_xu_ly'
  ) then
    alter table public.gstt_dm_failure_reason
      add constraint chk_gstt_fr_phong_ban_xu_ly
      check (phong_ban_xu_ly_mac_dinh is null or phong_ban_xu_ly_mac_dinh in (
        'PHONG_QLCL','PHONG_VTYT','PHONG_DAO_TAO','PHONG_DD','KHOA_KSNK'
      ));
  end if;
end$$;

comment on column public.gstt_dm_failure_reason.muc_do_canh_bao is
  'BINH_THUONG=log only · RCA=ticket 45 ngày · SENTINEL=báo động đỏ 24h (đâm kim, phơi nhiễm…).';
comment on column public.gstt_dm_failure_reason.mo_ta_canonical is
  'Wording chuẩn dùng cho thống kê toàn viện. tieu_chi_jsonb có thể override ten_hien_thi theo ngữ cảnh.';
comment on column public.gstt_dm_failure_reason.phong_ban_xu_ly_mac_dinh is
  'Routing đích cho RCA ticket khi reason này được chọn. NULL → fallback theo nhom_loi qua fn_gstt_rca_route_phong_ban.';
comment on column public.gstt_dm_failure_reason.han_xu_ly_ngay_mac_dinh is
  'Hạn xử lý mặc định tính từ ngày tạo ticket. SENTINEL thường = 1.';

-- ----------------------------------------------------
-- 2. Backfill metadata cho 21 reason hiện có
-- ----------------------------------------------------

-- HA_TANG_THIET_BI → PHONG_VTYT
update public.gstt_dm_failure_reason
   set phong_ban_xu_ly_mac_dinh = 'PHONG_VTYT',
       mo_ta_canonical = coalesce(mo_ta_canonical, mo_ta)
 where nhom_loi = 'HA_TANG_THIET_BI' and phong_ban_xu_ly_mac_dinh is null;

-- HE_THONG_TO_CHUC → PHONG_QLCL (mặc định)
update public.gstt_dm_failure_reason
   set phong_ban_xu_ly_mac_dinh = case
         when ma_loi = '202' then 'PHONG_DAO_TAO'   -- thiếu đào tạo
         else 'PHONG_QLCL'
       end,
       mo_ta_canonical = coalesce(mo_ta_canonical, mo_ta)
 where nhom_loi = 'HE_THONG_TO_CHUC' and phong_ban_xu_ly_mac_dinh is null;

-- YEU_TO_CON_NGUOI → PHONG_DD (Phòng Điều dưỡng)
update public.gstt_dm_failure_reason
   set phong_ban_xu_ly_mac_dinh = 'PHONG_DD',
       mo_ta_canonical = coalesce(mo_ta_canonical, mo_ta)
 where nhom_loi = 'YEU_TO_CON_NGUOI' and phong_ban_xu_ly_mac_dinh is null;

-- NGUOI_BENH_LAM_SANG → KHOA_KSNK
update public.gstt_dm_failure_reason
   set phong_ban_xu_ly_mac_dinh = 'KHOA_KSNK',
       mo_ta_canonical = coalesce(mo_ta_canonical, mo_ta)
 where nhom_loi = 'NGUOI_BENH_LAM_SANG' and phong_ban_xu_ly_mac_dinh is null;

-- Đánh dấu SENTINEL cho 304 (Cố ý vi phạm liều lĩnh)
update public.gstt_dm_failure_reason
   set muc_do_canh_bao = 'SENTINEL',
       han_xu_ly_ngay_mac_dinh = 1
 where ma_loi = '304';

-- Đánh dấu RCA cho các reason có yeu_cau_rca=true
update public.gstt_dm_failure_reason
   set muc_do_canh_bao = 'RCA'
 where yeu_cau_rca = true and muc_do_canh_bao = 'BINH_THUONG';

-- ----------------------------------------------------
-- 3. Insert 7 reason mới (bù vào những điểm 21 reason không phủ)
-- ----------------------------------------------------

insert into public.gstt_dm_failure_reason
  (ma_loi, nhom_loi, mo_ta, mo_ta_canonical, pham_vi_ap_dung,
   muc_do_canh_bao, yeu_cau_rca, yeu_cau_can_thiep,
   phong_ban_xu_ly_mac_dinh, han_xu_ly_ngay_mac_dinh,
   is_system, is_active)
values
  ('107', 'HA_TANG_THIET_BI',
   'Vật tư tiêu hao không đạt quy chuẩn (túi/hộp mỏng, hỏng bao bì, không đồng bộ)',
   'Vật tư tiêu hao không đạt quy chuẩn (sai loại, sai chất lượng, đóng gói lỗi).',
   ARRAY['TAT_CA','MOI_TRUONG','XU_LY_DC']::text[],
   'RCA', true, true, 'PHONG_VTYT', 45, true, true),

  ('108', 'HA_TANG_THIET_BI',
   'Bố trí / layout điểm chăm sóc không thuận tiện cho việc tuân thủ',
   'Vị trí thùng/giá/bồn rửa/hộp kháng thủng cách xa điểm chăm sóc, gây khó tuân thủ.',
   ARRAY['TAT_CA','VST','MOI_TRUONG']::text[],
   'RCA', true, true, 'PHONG_VTYT', 45, true, true),

  ('109', 'HA_TANG_THIET_BI',
   'Quá tải khu lưu giữ / tần suất thu gom không đáp ứng nhu cầu thực tế',
   'Khu lưu giữ trung gian đầy, lịch thu gom thưa hơn khối lượng phát sinh.',
   ARRAY['TAT_CA','MOI_TRUONG']::text[],
   'RCA', true, true, 'PHONG_VTYT', 45, true, true),

  ('206', 'HE_THONG_TO_CHUC',
   'Quy trình SOP có nhưng không cập nhật với tình huống thực tế tại đơn vị',
   'SOP đã ban hành nhưng nội dung lỗi thời, không khớp công nghệ/thiết bị/luồng việc mới.',
   ARRAY['TAT_CA']::text[],
   'RCA', true, true, 'PHONG_QLCL', 45, true, true),

  ('306', 'YEU_TO_CON_NGUOI',
   'Quên / sơ suất không cố ý (slip-lapse, không phải vi phạm chủ ý)',
   'Slip-lapse cognitive error — không cố ý, do tâm sinh lý hoặc workload tạm thời.',
   ARRAY['TAT_CA']::text[],
   'BINH_THUONG', false, true, 'PHONG_DD', 45, true, true),

  ('406', 'NGUOI_BENH_LAM_SANG',
   'Người nhà người bệnh / bên thứ 3 không tuân thủ quy định',
   'Khách thăm / người nhà / công ty thuê ngoài tự ý vi phạm quy trình KSNK.',
   ARRAY['TAT_CA','MOI_TRUONG']::text[],
   'BINH_THUONG', false, true, 'KHOA_KSNK', 45, true, true),

  ('407', 'NGUOI_BENH_LAM_SANG',
   'Tình huống quá tải bệnh viện / cấp cứu chen ngang ngoài kế hoạch',
   'Sự kiện bất thường: dồn bệnh, cấp cứu hàng loạt, sự kiện y tế công cộng.',
   ARRAY['TAT_CA']::text[],
   'BINH_THUONG', false, true, 'KHOA_KSNK', 45, true, true)
on conflict (ma_loi) do nothing;

-- ----------------------------------------------------
-- 4. Reload PostgREST schema cache
-- ----------------------------------------------------
notify pgrst, 'reload schema';

commit;
