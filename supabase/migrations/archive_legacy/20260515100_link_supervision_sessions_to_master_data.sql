-- supabase/migrations/20260515100_link_supervision_sessions_to_master_data.sql

-- 1. Thêm cột ID và FK cho fact_giam_sat_vst_sessions
ALTER TABLE public.fact_giam_sat_vst_sessions 
ADD COLUMN IF NOT EXISTS hinh_thuc_id uuid REFERENCES public.dm_hinh_thuc_giam_sat(id),
ADD COLUMN IF NOT EXISTS cach_thuc_id uuid REFERENCES public.dm_cach_thuc_giam_sat(id);

-- 2. Thêm cột ID và FK cho fact_giam_sat_chung_sessions
ALTER TABLE public.fact_giam_sat_chung_sessions 
ADD COLUMN IF NOT EXISTS hinh_thuc_id uuid REFERENCES public.dm_hinh_thuc_giam_sat(id),
ADD COLUMN IF NOT EXISTS cach_thuc_id uuid REFERENCES public.dm_cach_thuc_giam_sat(id);

-- 3. Data migration: Cố gắng map dữ liệu cũ từ text sang ID (dựa trên tên)
-- VST
UPDATE public.fact_giam_sat_vst_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_giam_sat = dm.ten_hinh_thuc AND s.hinh_thuc_id IS NULL;

UPDATE public.fact_giam_sat_vst_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_giam_sat = dm.ten_cach_thuc AND s.cach_thuc_id IS NULL;

-- GSC
UPDATE public.fact_giam_sat_chung_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_giam_sat = dm.ten_hinh_thuc AND s.hinh_thuc_id IS NULL;

UPDATE public.fact_giam_sat_chung_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_giam_sat = dm.ten_cach_thuc AND s.cach_thuc_id IS NULL;

-- 4. Cập nhật View GSC Full để lấy tên từ ID thay vì từ cột text cũ
-- DROP bắt buộc: s.* thêm cột mới — CREATE OR REPLACE không đổi thứ tự cột view cũ được.
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_chung_sessions_full AS
SELECT 
    s.*,
    k.ten_khoa as ten_khoa_phong,
    kv.ten_khu_vuc as ten_khu_vuc_giam_sat,
    ns_gs.ho_ten as ten_nguoi_giam_sat,
    ns_nv.ho_ten as ten_nhan_vien,
    ns_nv.ma_nv as ma_nhan_vien,
    nn.ten_nghe_nghiep as ten_nghe_nghiep,
    dm_ht.ten_hinh_thuc as ten_hinh_thuc_giam_sat,
    dm_ct.ten_cach_thuc as ten_cach_thuc_giam_sat
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
LEFT JOIN public.mdm_nhan_su ns_gs ON s.nguoi_giam_sat_id = ns_gs.id
LEFT JOIN public.mdm_nhan_su ns_nv ON s.nhan_vien_id = ns_nv.id
LEFT JOIN public.dm_nghe_nghiep nn ON s.nghe_nghiep_id = nn.id
LEFT JOIN public.dm_hinh_thuc_giam_sat dm_ht ON s.hinh_thuc_id = dm_ht.id
LEFT JOIN public.dm_cach_thuc_giam_sat dm_ct ON s.cach_thuc_id = dm_ct.id;
