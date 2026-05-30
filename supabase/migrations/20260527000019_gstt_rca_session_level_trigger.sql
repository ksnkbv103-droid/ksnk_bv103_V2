-- Migration: Session-level RCA trigger refactor
-- Slice 6 (session-level RCA v5): trigger đọc nguyen_nhan_loi_ids từ CỘT session-level,
-- gộp tiêu chí KHONG_DAT từ results_jsonb thành mô tả, GROUP BY phong_ban_xu_ly để
-- 1 phiên sinh tối đa N ticket = số phòng ban liên quan (không phải số tiêu chí KĐ).
-- Date: 27/05/2026

begin;

-- ----------------------------------------------------
-- 1. Bỏ unique partial index per-criterion (không còn áp dụng).
--    Thay bằng unique partial index per (phien, phong_ban) cho GSC.
-- ----------------------------------------------------

drop index if exists uq_gstt_rca_chung_session_criterion;

drop index if exists uq_gstt_rca_chung_session_phong_ban;
create unique index uq_gstt_rca_chung_session_phong_ban
  on public.gstt_fact_rca_ticket (phien_giam_sat_id, phong_ban_xu_ly)
  where nguon_phat_sinh = 'GIAM_SAT_CHUNG';

-- ----------------------------------------------------
-- 2. Replace function: đọc session-level reasons, gom criterion_id list
--    vào mô tả, GROUP BY phong_ban → mỗi phòng ban 1 ticket.
-- ----------------------------------------------------

create or replace function public.fn_gstt_rca_create_from_chung_session()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason_ids       uuid[];
  v_active_reasons   public.gstt_dm_failure_reason[];
  v_phong_ban_groups jsonb;
  v_group            jsonb;
  v_phong_ban        text;
  v_group_reasons    public.gstt_dm_failure_reason[];
  v_first_reason     public.gstt_dm_failure_reason;
  v_kd_criteria      jsonb;
  v_kd_criteria_text text;
  v_mo_ta            text;
  v_ma_ticket        text;
  v_now              timestamptz := now();
  v_han              date;
  v_max_canh_bao     text;
  v_min_han_ngay     int;
begin
  -- Bỏ qua nếu phiên không active hoặc không có cột mới.
  if coalesce(new.is_active, true) = false then
    return new;
  end if;
  if new.nguyen_nhan_loi_ids is null
     or array_length(new.nguyen_nhan_loi_ids, 1) is null then
    return new;
  end if;
  if new.nguoi_giam_sat_id is null then
    return new;
  end if;

  -- Bỏ trùng + lọc rỗng.
  v_reason_ids := (
    select array_agg(distinct rid)
      from unnest(new.nguyen_nhan_loi_ids) rid
     where rid is not null
  );
  if array_length(v_reason_ids, 1) is null then
    return new;
  end if;

  -- Lấy danh sách reasons active có yeu_cau_rca → mới tạo ticket.
  v_active_reasons := array(
    select r
      from public.gstt_dm_failure_reason r
     where r.id = any(v_reason_ids)
       and r.is_active = true
       and r.yeu_cau_rca = true
     order by r.ma_loi
  );
  if array_length(v_active_reasons, 1) is null then
    return new;
  end if;

  v_first_reason := v_active_reasons[1];

  -- Tính mức cảnh báo cao nhất từ tất cả reason đã chọn (kể cả BINH_THUONG).
  select case
           when bool_or(r.muc_do_canh_bao = 'SENTINEL') then 'SENTINEL'
           when bool_or(r.muc_do_canh_bao = 'RCA')      then 'RCA'
           else 'BINH_THUONG'
         end
    into v_max_canh_bao
    from public.gstt_dm_failure_reason r
   where r.id = any(v_reason_ids) and r.is_active = true;

  -- Cập nhật mức cảnh báo cao nhất lên row (không gọi đệ quy trigger
  -- vì trigger này gắn AFTER, không OF cột này).
  if coalesce(new.muc_do_canh_bao_cao_nhat, '') is distinct from coalesce(v_max_canh_bao, '') then
    update public.gstt_fact_chung_sessions
       set muc_do_canh_bao_cao_nhat = v_max_canh_bao
     where id = new.id;
  end if;

  -- Build chuỗi tiêu chí KHONG_DAT làm context cho mô tả ticket (max 5).
  select string_agg(
           format('  - [%s] %s',
                  coalesce(item->>'ma_tc', item->>'criterion_id'),
                  left(coalesce(item->>'noi_dung', item->>'note', ''), 80)),
           e'\n')
    into v_kd_criteria_text
    from jsonb_array_elements(coalesce(new.results_jsonb, '[]'::jsonb)) as item
   where item->>'value' = 'KHONG_DAT';
  v_kd_criteria_text := coalesce(v_kd_criteria_text, '  (không liệt kê chi tiết)');

  -- GROUP reasons by phong_ban (lấy phong_ban_xu_ly_mac_dinh từ master,
  -- fallback fn_gstt_rca_route_phong_ban theo nhom_loi).
  v_phong_ban_groups := (
    select jsonb_agg(jsonb_build_object(
             'phong_ban', phong_ban,
             'reason_ids', reason_ids,
             'min_han_ngay', min_han_ngay
           ))
      from (
        select
          coalesce(r.phong_ban_xu_ly_mac_dinh,
                   public.fn_gstt_rca_route_phong_ban(r.nhom_loi, r.ma_loi)) as phong_ban,
          array_agg(r.id order by r.ma_loi) as reason_ids,
          min(r.han_xu_ly_ngay_mac_dinh) as min_han_ngay
        from unnest(v_active_reasons) r
        group by 1
      ) g
  );

  -- Iterate qua từng phòng ban, upsert 1 ticket / phòng ban.
  for v_group in select * from jsonb_array_elements(v_phong_ban_groups) loop
    v_phong_ban := v_group->>'phong_ban';
    v_min_han_ngay := nullif(v_group->>'min_han_ngay','')::int;
    v_han := (v_now at time zone 'UTC')::date + (coalesce(v_min_han_ngay, 45) || ' days')::interval;

    v_group_reasons := array(
      select r
        from public.gstt_dm_failure_reason r
       where r.id::text in (select jsonb_array_elements_text(v_group->'reason_ids'))
       order by r.ma_loi
    );

    -- Mô tả: tổng quan phiên + danh sách reason + danh sách tiêu chí KHONG_DAT.
    select string_agg(format('  • %s — %s', r.ma_loi, coalesce(r.mo_ta_canonical, r.mo_ta)), e'\n')
      into v_mo_ta
      from unnest(v_group_reasons) r;

    v_mo_ta := format(
      'Phiên giám sát %s — Ngày %s — Khoa %s%s'
      || 'Nguyên nhân (phòng ban %s):%s%s%s'
      || 'Tiêu chí KHÔNG ĐẠT trong phiên:%s%s',
      coalesce(new.id::text, '?'),
      coalesce(new.ngay_giam_sat::text, '?'),
      coalesce(new.khoa_id::text, '?'),
      e'\n\n',
      v_phong_ban, e'\n', v_mo_ta, e'\n\n',
      e'\n', v_kd_criteria_text
    );

    v_ma_ticket := public.fn_gstt_rca_gen_ma_ticket(v_now);

    insert into public.gstt_fact_rca_ticket (
      ma_ticket, nguon_phat_sinh, phien_giam_sat_id,
      nguyen_nhan_loi_id, nguyen_nhan_loi_ids, criterion_id,
      mo_ta_su_co, khu_vuc_xay_ra_id, nguoi_bao_cao_id,
      phong_ban_xu_ly, trang_thai, han_xu_ly, created_at, updated_at
    ) values (
      v_ma_ticket, 'GIAM_SAT_CHUNG', new.id,
      v_group_reasons[1].id,
      array(select r.id from unnest(v_group_reasons) r),
      null,
      v_mo_ta, new.khoa_id, new.nguoi_giam_sat_id,
      v_phong_ban, 'MOI', v_han, v_now, v_now
    )
    on conflict (phien_giam_sat_id, phong_ban_xu_ly)
    where nguon_phat_sinh = 'GIAM_SAT_CHUNG'
    do update set
      nguyen_nhan_loi_ids = excluded.nguyen_nhan_loi_ids,
      nguyen_nhan_loi_id  = excluded.nguyen_nhan_loi_id,
      mo_ta_su_co         = excluded.mo_ta_su_co,
      han_xu_ly           = case
                              when public.gstt_fact_rca_ticket.trang_thai in ('HOAN_THANH','HUY')
                                then public.gstt_fact_rca_ticket.han_xu_ly
                              else excluded.han_xu_ly
                            end,
      updated_at          = v_now;
  end loop;

  return new;
end;
$$;

comment on function public.fn_gstt_rca_create_from_chung_session() is
  'Slice 6 session-level RCA v5: scan cột nguyen_nhan_loi_ids[] sau INSERT/UPDATE phiên giám sát chung. '
  'Lọc reasons có yeu_cau_rca=true, GROUP BY phong_ban_xu_ly_mac_dinh → 1 ticket / phòng ban / phiên. '
  'Idempotent qua partial UNIQUE (phien, phong_ban).';

-- ----------------------------------------------------
-- 3. Re-attach trigger với danh sách cột mới (nguyen_nhan_loi_ids).
-- ----------------------------------------------------

drop trigger if exists trg_gstt_rca_from_chung_session on public.gstt_fact_chung_sessions;
create trigger trg_gstt_rca_from_chung_session
  after insert or update of nguyen_nhan_loi_ids, results_jsonb
  on public.gstt_fact_chung_sessions
  for each row execute function public.fn_gstt_rca_create_from_chung_session();

-- ----------------------------------------------------
-- 4. Reload PostgREST schema cache
-- ----------------------------------------------------
notify pgrst, 'reload schema';

commit;
