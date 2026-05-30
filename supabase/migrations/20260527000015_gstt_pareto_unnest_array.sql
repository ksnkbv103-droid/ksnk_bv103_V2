-- Migration: Update Pareto view để dùng nguyen_nhan_loi_ids (array) cho GSC.
-- VST giữ nguyên single nguyen_nhan_loi_id (Phase 2 sẽ migrate).
-- Date: 27/05/2026 (Slice 5 multi-cause v4)

begin;

drop view if exists public.v_gstt_dashboard_pareto_v3 cascade;
create view public.v_gstt_dashboard_pareto_v3
with (security_invoker = true) as
with gsc_failures as (
  select
    s.id            as session_id,
    s.khoa_id       as khoa_id,
    s.ngay_giam_sat as ngay,
    reason_id::uuid as nguyen_nhan_loi_id
  from public.gstt_fact_chung_sessions s
       cross join lateral jsonb_array_elements(coalesce(s.results_jsonb, '[]'::jsonb)) as item
       cross join lateral jsonb_array_elements_text(
         coalesce(item->'nguyen_nhan_loi_ids', '[]'::jsonb)
       ) as reason_id
  where coalesce(s.is_active, true) = true
    and (item->>'value') = 'KHONG_DAT'
    and jsonb_typeof(item->'nguyen_nhan_loi_ids') = 'array'
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
  fr.id        as nguyen_nhan_loi_id,
  fr.ma_loi,
  fr.nhom_loi,
  fr.mo_ta,
  fr.yeu_cau_rca
from all_failures af
join public.gstt_dm_failure_reason fr on fr.id = af.nguyen_nhan_loi_id;

comment on view public.v_gstt_dashboard_pareto_v3 is
  'Slice 5 multi-cause v4: Pareto 4 màu — GSC unnest nguyen_nhan_loi_ids[] mỗi tiêu chí KHONG_DAT; '
  'VST tạm giữ single nguyen_nhan_loi_id. Mỗi reason = 1 row để dashboard GROUP BY nhom_loi/khoa_id đếm đúng.';

notify pgrst, 'reload schema';

commit;
