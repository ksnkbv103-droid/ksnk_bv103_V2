select
  count(*) filter (where loai_giam_sat = 'TUAN_THU') as tuan_thu_total,
  count(*) filter (
    where loai_giam_sat = 'TUAN_THU'
      and coalesce(jsonb_array_length(nguyen_nhan_cho_phep_jsonb), 0) >= 5
  ) as co_allowlist_ngu_canh,
  count(*) filter (
    where loai_giam_sat = 'TUAN_THU'
      and coalesce(jsonb_array_length(hanh_dong_khac_phuc_jsonb), 0) >= 4
  ) as co_hanh_dong_ngu_canh
from public.gstt_dm_bang_kiem
where is_active = true;

select ma_bk,
  (nguyen_nhan_cho_phep_jsonb->0->>'lookup_code') as mau_ly_do_1,
  (hanh_dong_khac_phuc_jsonb->0->>'action_code') as mau_act_1
from public.gstt_dm_bang_kiem
where ma_bk in ('BM.03.03', 'BM.09.01', 'BM.18.02');
