-- Smoke test Slice 6 (session-level RCA v5).
-- Validate trigger create ticket grouped by phong_ban, idempotent re-save.

begin;

-- 1. Setup: lấy bảng kiểm BM.07.01 VST + 3 reason: 1 PHONG_DD (RCA), 1 PHONG_VTYT (RCA), 1 SENTINEL (PHONG_DD).
do $$
declare
  v_bk_id       uuid;
  v_khoa_id     uuid;
  v_nguoi_gs_id uuid;
  v_session_id  uuid;
  v_r_303       uuid;  -- PHONG_DD, RCA
  v_r_109       uuid;  -- PHONG_VTYT, RCA
  v_r_304       uuid;  -- PHONG_DD, SENTINEL
  v_ticket_count int;
  v_phong_bans  text[];
  v_session_muc text;
begin
  select id into v_bk_id from public.gstt_dm_bang_kiem where ma_bk = 'BM.07.01';
  select id into v_khoa_id from public.mdm_dm_khoa_phong where is_active = true order by id limit 1;
  select id into v_nguoi_gs_id from public.mdm_nhan_su where is_active = true limit 1;
  select id into v_r_303 from public.gstt_dm_failure_reason where ma_loi = '303';
  select id into v_r_109 from public.gstt_dm_failure_reason where ma_loi = '109';
  select id into v_r_304 from public.gstt_dm_failure_reason where ma_loi = '304';

  raise notice 'Setup: bk=%, khoa=%, nguoi_gs=%, r303=%, r109=%, r304=%',
    v_bk_id, v_khoa_id, v_nguoi_gs_id, v_r_303, v_r_109, v_r_304;

  -- 2. Insert session with 3 reasons + 2 KHONG_DAT criteria
  insert into public.gstt_fact_chung_sessions (
    id, bang_kiem_id, khoa_id, nguoi_giam_sat_id, ngay_giam_sat,
    thoi_gian_ghi_nhan, tong_diem, results_jsonb, nguyen_nhan_loi_ids,
    ghi_chu_phan_tich, is_active
  ) values (
    gen_random_uuid(), v_bk_id, v_khoa_id, v_nguoi_gs_id, current_date,
    now(), 50,
    jsonb_build_array(
      jsonb_build_object('criterion_id', gen_random_uuid()::text,
                         'value', 'KHONG_DAT',
                         'ma_tc', '1001',
                         'noi_dung', 'Cơ hội 1: TRƯỚC tiếp xúc NB'),
      jsonb_build_object('criterion_id', gen_random_uuid()::text,
                         'value', 'KHONG_DAT',
                         'ma_tc', '1003',
                         'noi_dung', 'Cơ hội 3: SAU phơi nhiễm dịch')
    ),
    array[v_r_303, v_r_109, v_r_304],
    'Test session-level RCA',
    true
  ) returning id into v_session_id;

  raise notice 'Inserted session %', v_session_id;

  -- 3. Check ticket count = 2 (PHONG_DD + PHONG_VTYT)
  select count(*), array_agg(distinct phong_ban_xu_ly order by phong_ban_xu_ly)
    into v_ticket_count, v_phong_bans
    from public.gstt_fact_rca_ticket
   where phien_giam_sat_id = v_session_id;

  raise notice 'Ticket count = %, phong_bans = %', v_ticket_count, v_phong_bans;
  if v_ticket_count <> 2 then
    raise exception 'FAIL: expected 2 tickets (PHONG_DD + PHONG_VTYT), got %', v_ticket_count;
  end if;
  if not (v_phong_bans @> array['PHONG_DD','PHONG_VTYT']) then
    raise exception 'FAIL: phong_bans missing PHONG_DD or PHONG_VTYT — got %', v_phong_bans;
  end if;

  -- 4. PHONG_DD ticket should have han_xu_ly = today + 1 day (SENTINEL r304 min)
  declare v_han date;
  begin
    select han_xu_ly into v_han
      from public.gstt_fact_rca_ticket
     where phien_giam_sat_id = v_session_id and phong_ban_xu_ly = 'PHONG_DD';
    raise notice 'PHONG_DD han_xu_ly = %', v_han;
    if v_han <> current_date + 1 then
      raise exception 'FAIL: PHONG_DD han_xu_ly should be %, got %', current_date+1, v_han;
    end if;
  end;

  -- 5. Session.muc_do_canh_bao_cao_nhat = SENTINEL
  select muc_do_canh_bao_cao_nhat into v_session_muc
    from public.gstt_fact_chung_sessions where id = v_session_id;
  raise notice 'Session muc_do_canh_bao_cao_nhat = %', v_session_muc;
  if v_session_muc <> 'SENTINEL' then
    raise exception 'FAIL: session muc_do_canh_bao_cao_nhat should be SENTINEL, got %', v_session_muc;
  end if;

  -- 6. Re-save (idempotency): remove SENTINEL, keep 303 + 109 → still 2 tickets, han 45.
  update public.gstt_fact_chung_sessions
     set nguyen_nhan_loi_ids = array[v_r_303, v_r_109]
   where id = v_session_id;

  select count(*), array_agg(distinct phong_ban_xu_ly order by phong_ban_xu_ly)
    into v_ticket_count, v_phong_bans
    from public.gstt_fact_rca_ticket
   where phien_giam_sat_id = v_session_id;
  raise notice 'After re-save: ticket_count = %, phong_bans = %', v_ticket_count, v_phong_bans;
  if v_ticket_count <> 2 then
    raise exception 'FAIL: re-save should keep 2 tickets, got %', v_ticket_count;
  end if;

  declare v_han2 date;
  begin
    select han_xu_ly into v_han2
      from public.gstt_fact_rca_ticket
     where phien_giam_sat_id = v_session_id and phong_ban_xu_ly = 'PHONG_DD';
    raise notice 'After re-save: PHONG_DD han_xu_ly = %', v_han2;
    -- Han_xu_ly chỉ được update khi ticket chưa HOAN_THANH/HUY.
    if v_han2 <> current_date + 45 then
      raise exception 'FAIL: after-resave PHONG_DD han_xu_ly should be %, got %', current_date+45, v_han2;
    end if;
  end;

  -- 7. Verify Pareto view returns rows.
  declare v_pareto int;
  begin
    select count(*) into v_pareto
      from public.v_gstt_dashboard_pareto_v3
     where session_id = v_session_id;
    raise notice 'Pareto rows for session = %', v_pareto;
    if v_pareto <> 2 then
      raise exception 'FAIL: Pareto should have 2 rows (303 + 109), got %', v_pareto;
    end if;
  end;

  raise notice 'ALL SMOKE TESTS PASS ✅';
end$$;

rollback;
