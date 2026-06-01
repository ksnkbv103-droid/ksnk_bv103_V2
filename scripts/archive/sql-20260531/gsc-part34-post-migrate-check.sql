-- Kiểm tra sau migrate Phần 3–4 (chạy: npm run mdm:postcheck hoặc supabase db query --linked -f ...)
select
  count(*) filter (where loai_giam_sat = 'TUAN_THU') as tuan_thu_total,
  count(*) filter (
    where loai_giam_sat = 'TUAN_THU'
      and coalesce(jsonb_array_length(nguyen_nhan_cho_phep_jsonb), 0) > 0
  ) as co_allowlist,
  count(*) filter (
    where loai_giam_sat = 'TUAN_THU'
      and coalesce(jsonb_array_length(hanh_dong_khac_phuc_jsonb), 0) > 0
  ) as co_hanh_dong
from public.gstt_dm_bang_kiem
where is_active = true;

select ma_bk, ten_bang_kiem,
  jsonb_array_length(nguyen_nhan_cho_phep_jsonb) as n_reasons,
  jsonb_array_length(hanh_dong_khac_phuc_jsonb) as n_actions
from public.gstt_dm_bang_kiem
where loai_giam_sat = 'TUAN_THU' and is_active = true
order by ma_bk
limit 10;
