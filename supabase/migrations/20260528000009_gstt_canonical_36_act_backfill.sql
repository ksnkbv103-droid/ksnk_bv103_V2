-- 20260528000009_gstt_canonical_36_act_backfill.sql
-- Bổ sung hanh_dong_khac_phuc_jsonb cho 4 mẫu không có trong part34 seed
begin;

-- BM.10.01: 0 hành động
update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = $jsonb$[]$jsonb$::jsonb where ma_bk = 'BM.10.01';

-- BM.QĐ.19.03: 0 hành động
update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = $jsonb$[]$jsonb$::jsonb where ma_bk = 'BM.QĐ.19.03';

-- BM.27.02: 0 hành động
update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = $jsonb$[]$jsonb$::jsonb where ma_bk = 'BM.27.02';

-- BM.QĐ.20.01: 0 hành động
update public.gstt_dm_bang_kiem set hanh_dong_khac_phuc_jsonb = $jsonb$[]$jsonb$::jsonb where ma_bk = 'BM.QĐ.20.01';

commit;