-- Migration: Session-level RCA columns
-- Slice 6 (session-level RCA v5): chuyển phân tích nguyên nhân từ per-criterion → session-level.
-- Theo mẫu JCI PCI.05/FMS.05: Phần 3 RCA nằm CUỐI bảng kiểm sau khi kết luận tổng thể.
-- Date: 27/05/2026

begin;

-- ----------------------------------------------------
-- 1. Thêm 3 cột session-level vào gstt_fact_chung_sessions
-- ----------------------------------------------------

alter table public.gstt_fact_chung_sessions
  add column if not exists nguyen_nhan_loi_ids uuid[],
  add column if not exists ghi_chu_phan_tich text,
  add column if not exists muc_do_canh_bao_cao_nhat text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'chk_gsc_sessions_muc_do_canh_bao'
  ) then
    alter table public.gstt_fact_chung_sessions
      add constraint chk_gsc_sessions_muc_do_canh_bao
      check (muc_do_canh_bao_cao_nhat is null
             or muc_do_canh_bao_cao_nhat in ('BINH_THUONG','RCA','SENTINEL'));
  end if;
end$$;

comment on column public.gstt_fact_chung_sessions.nguyen_nhan_loi_ids is
  'Slice 6 (session-level RCA v5): mảng FK gstt_dm_failure_reason — phân tích nguyên nhân cấp PHIÊN '
  '(không còn per-criterion). 1 phiên có ≥1 tiêu chí KHONG_DAT → bắt buộc ≥1 reason ở UI.';
comment on column public.gstt_fact_chung_sessions.ghi_chu_phan_tich is
  'Ghi chú diễn giải của giám sát viên cho phần phân tích nguyên nhân tổng hợp.';
comment on column public.gstt_fact_chung_sessions.muc_do_canh_bao_cao_nhat is
  'Mức cảnh báo cao nhất tổng hợp từ các reason đã chọn (server-side derive trong trigger).';

-- GIN index cho Pareto unnest fast
create index if not exists idx_gsc_sessions_nguyen_nhan_loi_ids
  on public.gstt_fact_chung_sessions using gin (nguyen_nhan_loi_ids);

create index if not exists idx_gsc_sessions_muc_do_canh_bao
  on public.gstt_fact_chung_sessions (muc_do_canh_bao_cao_nhat)
  where muc_do_canh_bao_cao_nhat is not null;

-- ----------------------------------------------------
-- 2. Reload PostgREST schema cache
-- ----------------------------------------------------
notify pgrst, 'reload schema';

commit;
