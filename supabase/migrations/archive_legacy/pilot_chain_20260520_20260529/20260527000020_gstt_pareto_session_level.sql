-- Migration: Pareto view session-level
-- Slice 6 (session-level RCA v5): unnest cột nguyen_nhan_loi_ids[] cấp phiên,
-- không còn lateral join 2 cấp qua results_jsonb.
-- Date: 27/05/2026

begin;

drop view if exists public.v_gstt_dashboard_pareto_v3 cascade;

create view public.v_gstt_dashboard_pareto_v3
with (security_invoker = true) as
with gsc_failures as (
  select
    s.id            as session_id,
    s.khoa_id       as khoa_id,
    s.ngay_giam_sat as ngay,
    reason_id       as nguyen_nhan_loi_id
  from public.gstt_fact_chung_sessions s
       cross join lateral unnest(s.nguyen_nhan_loi_ids) as reason_id
  where coalesce(s.is_active, true) = true
    and s.nguyen_nhan_loi_ids is not null
    and array_length(s.nguyen_nhan_loi_ids, 1) is not null
), vst_failures as (
  select
    o.session_id    as session_id,
    o.khoa_id       as khoa_id,
    o.ngay_giam_sat as ngay,
    o.nguyen_nhan_loi_id
  from public.gstt_fact_vst o
  where o.nguyen_nhan_loi_id is not null
), all_failures as (
  select 'GIAM_SAT_CHUNG'::text as nguon, * from gsc_failures
  union all
  select 'GIAM_SAT_VST'::text   as nguon, * from vst_failures
)
select
  af.nguon,
  af.session_id,
  af.khoa_id,
  af.ngay,
  fr.id          as nguyen_nhan_loi_id,
  fr.ma_loi,
  fr.nhom_loi,
  fr.mo_ta,
  fr.mo_ta_canonical,
  fr.yeu_cau_rca,
  fr.muc_do_canh_bao
from all_failures af
join public.gstt_dm_failure_reason fr on fr.id = af.nguyen_nhan_loi_id;

comment on view public.v_gstt_dashboard_pareto_v3 is
  'Slice 6 session-level v5: Pareto 4 màu — GSC unnest cột nguyen_nhan_loi_ids[] cấp phiên (gọn hơn). '
  'VST giữ single nguyen_nhan_loi_id. Mỗi reason = 1 row để dashboard GROUP BY nhom_loi/khoa_id/muc_do_canh_bao.';

notify pgrst, 'reload schema';

commit;
