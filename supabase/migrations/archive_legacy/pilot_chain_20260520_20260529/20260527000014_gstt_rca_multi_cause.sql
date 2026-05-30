-- Migration: Slice 5 reform v4 multi-cause (JCI Ishikawa fishbone)
-- 1 vấn đề (tiêu chí KHÔNG_DAT) có thể có nhiều nguyên nhân.
-- Phase 1: chỉ áp dụng cho `giam-sat-chung` (results_jsonb). VST giữ single tạm thời.
-- Date: 27/05/2026

begin;

-- ----------------------------------------------------
-- 1. Schema gstt_fact_rca_ticket: thêm cột array + criterion_id.
--    Giữ cột cũ nguyen_nhan_loi_id cho VST (Phase 2 sẽ migrate).
-- ----------------------------------------------------

alter table public.gstt_fact_rca_ticket
  alter column nguyen_nhan_loi_id drop not null;

alter table public.gstt_fact_rca_ticket
  add column if not exists nguyen_nhan_loi_ids uuid[],
  add column if not exists criterion_id uuid;

comment on column public.gstt_fact_rca_ticket.nguyen_nhan_loi_ids is
  'Mảng FK gstt_dm_failure_reason — multi-cause Ishikawa (Phase 1: giam-sat-chung). VST tạm dùng nguyen_nhan_loi_id (single).';
comment on column public.gstt_fact_rca_ticket.nguyen_nhan_loi_id is
  'DEPRECATED cho GSC từ multi-cause v4. Giữ NULL cho GSC; vẫn dùng cho VST (Phase 2 sẽ migrate sang array).';
comment on column public.gstt_fact_rca_ticket.criterion_id is
  'Tiêu chí KHÔNG_DAT trong phiên giám sát chung. NULL cho VST (VST check hành vi, không có tiêu chí).';

-- GIN index cho query ANY reason_id trên array.
create index if not exists idx_gstt_rca_reason_ids
  on public.gstt_fact_rca_ticket using gin (nguyen_nhan_loi_ids);

create index if not exists idx_gstt_rca_criterion
  on public.gstt_fact_rca_ticket (phien_giam_sat_id, criterion_id)
  where criterion_id is not null;

-- ----------------------------------------------------
-- 2. Replace UNIQUE constraint:
--    GSC: UNIQUE per (session, criterion) — 1 ticket / tiêu chí / phiên.
--    VST: UNIQUE per (session, reason_id) — giữ nguyên Phase 2 sẽ chuyển.
-- ----------------------------------------------------

alter table public.gstt_fact_rca_ticket
  drop constraint if exists uq_gstt_rca_nguon_phien_reason;

drop index if exists uq_gstt_rca_chung_session_criterion;
create unique index uq_gstt_rca_chung_session_criterion
  on public.gstt_fact_rca_ticket (phien_giam_sat_id, criterion_id)
  where nguon_phat_sinh = 'GIAM_SAT_CHUNG' and criterion_id is not null;

drop index if exists uq_gstt_rca_vst_session_reason;
create unique index uq_gstt_rca_vst_session_reason
  on public.gstt_fact_rca_ticket (phien_giam_sat_id, nguyen_nhan_loi_id)
  where nguon_phat_sinh = 'GIAM_SAT_VST' and nguyen_nhan_loi_id is not null;

-- ----------------------------------------------------
-- 3. Trigger function MỚI cho GSC: đọc nguyen_nhan_loi_ids (array).
--    Routing phong_ban_xu_ly theo reason RCA đầu tiên (priority order).
--    Tạo 1 ticket cho mỗi tiêu chí, kèm full danh sách reason_ids.
-- ----------------------------------------------------

create or replace function public.fn_gstt_rca_create_from_chung_session()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result        jsonb;
  v_reason_ids    uuid[];
  v_reason_id     uuid;
  v_rca_reasons   public.gstt_dm_failure_reason[];
  v_first_rca     public.gstt_dm_failure_reason;
  v_reason_row    public.gstt_dm_failure_reason%rowtype;
  v_phong_ban     text;
  v_ma_ticket     text;
  v_mo_ta         text;
  v_criterion_id  uuid;
  v_now           timestamptz := now();
  v_han           date := (v_now at time zone 'UTC')::date + interval '45 days';
begin
  if new.results_jsonb is null or jsonb_typeof(new.results_jsonb) <> 'array' then
    return new;
  end if;

  if new.nguoi_giam_sat_id is null then
    return new;
  end if;

  for v_result in select * from jsonb_array_elements(new.results_jsonb)
  loop
    -- Bỏ qua nếu không phải KHONG_DAT hoặc không có nguyên nhân.
    if (v_result->>'value') is distinct from 'KHONG_DAT' then
      continue;
    end if;
    if jsonb_typeof(v_result->'nguyen_nhan_loi_ids') <> 'array' then
      continue;
    end if;

    -- Parse mảng reason_ids từ JSONB.
    v_reason_ids := array(
      select val::uuid
        from jsonb_array_elements_text(v_result->'nguyen_nhan_loi_ids') as val
       where val is not null and val <> ''
    );
    if array_length(v_reason_ids, 1) is null then
      continue;
    end if;

    -- Lấy danh sách reasons có yeu_cau_rca trong mảng đã chọn.
    v_rca_reasons := array(
      select r
        from public.gstt_dm_failure_reason r
       where r.id = any(v_reason_ids)
         and r.is_active = true
         and r.yeu_cau_rca = true
       order by r.ma_loi
    );
    if array_length(v_rca_reasons, 1) is null then
      continue; -- Không có reason nào cần RCA → bỏ qua.
    end if;

    v_first_rca := v_rca_reasons[1];
    v_phong_ban := public.fn_gstt_rca_route_phong_ban(v_first_rca.nhom_loi, v_first_rca.ma_loi);
    v_ma_ticket := public.fn_gstt_rca_gen_ma_ticket(v_now);
    v_criterion_id := nullif(v_result->>'criterion_id', '')::uuid;

    -- Compose mô tả: liệt kê tối đa 3 reason đầu, có "...+N nữa" nếu thừa.
    select string_agg(format('• %s — %s', r.ma_loi, r.mo_ta), e'\n')
      into v_mo_ta
      from public.gstt_dm_failure_reason r
     where r.id = any(v_reason_ids)
       and r.is_active = true
     limit 5;
    v_mo_ta := format(
      'Phiên giám sát %s ngày %s — Tiêu chí %s%s%s',
      coalesce(new.id::text, '?'),
      coalesce(new.ngay_giam_sat::text, '?'),
      coalesce(v_criterion_id::text, '?'),
      e'\n',
      coalesce(v_mo_ta, v_first_rca.mo_ta)
    );

    insert into public.gstt_fact_rca_ticket (
      ma_ticket, nguon_phat_sinh, phien_giam_sat_id,
      nguyen_nhan_loi_id, nguyen_nhan_loi_ids, criterion_id,
      mo_ta_su_co, khu_vuc_xay_ra_id, nguoi_bao_cao_id,
      phong_ban_xu_ly, trang_thai, han_xu_ly, created_at, updated_at
    ) values (
      v_ma_ticket, 'GIAM_SAT_CHUNG', new.id,
      null, v_reason_ids, v_criterion_id,
      v_mo_ta, new.khoa_id, new.nguoi_giam_sat_id,
      v_phong_ban, 'MOI', v_han, v_now, v_now
    )
    on conflict (phien_giam_sat_id, criterion_id)
    where nguon_phat_sinh = 'GIAM_SAT_CHUNG' and criterion_id is not null
    do update set
      -- Nếu user save lại phiên với danh sách reasons thay đổi → cập nhật array + mo_ta.
      nguyen_nhan_loi_ids = excluded.nguyen_nhan_loi_ids,
      mo_ta_su_co        = excluded.mo_ta_su_co,
      updated_at         = v_now;

    -- Reload reason_row for clarity (not used further).
    v_reason_id := v_first_rca.id;
    v_reason_row := v_first_rca;
  end loop;

  return new;
end;
$$;

comment on function public.fn_gstt_rca_create_from_chung_session() is
  'Slice 5 multi-cause v4: scan results_jsonb sau INSERT/UPDATE phiên giám sát chung; '
  'mỗi tiêu chí KHÔNG_DAT có ≥1 reason yeu_cau_rca → tạo 1 ticket lưu nguyen_nhan_loi_ids[]. '
  'Idempotent qua partial UNIQUE (phien, criterion).';

-- Re-attach trigger (function đã thay).
drop trigger if exists trg_gstt_rca_from_chung_session on public.gstt_fact_chung_sessions;
create trigger trg_gstt_rca_from_chung_session
  after insert or update of results_jsonb on public.gstt_fact_chung_sessions
  for each row execute function public.fn_gstt_rca_create_from_chung_session();

-- ----------------------------------------------------
-- 4. Reload PostgREST schema cache
-- ----------------------------------------------------
notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- Note: VST trigger trg_gstt_rca_from_vst_obs giữ nguyên (đọc nguyen_nhan_loi_id single).
-- Phase 2 sẽ migrate gstt_fact_vst.nguyen_nhan_loi_id → uuid[] và update trigger này.
-- ============================================================================
