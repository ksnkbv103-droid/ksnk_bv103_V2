-- supabase/migrations/20260707002_gsc_optimization_view.sql

-- View tổng hợp cho Giám sát chung (GSC)
-- Giúp loại bỏ việc JOIN thủ công và Enrichment trong TypeScript
CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full AS
SELECT 
    s.*,
    k.ten_khoa as ten_khoa_phong,
    kv.ten_khu_vuc as ten_khu_vuc_giam_sat,
    ns_gs.ho_ten as ten_nguoi_giam_sat,
    ns_nv.ho_ten as ten_nhan_vien,
    ns_nv.ma_nv as ma_nhan_vien,
    nn.ten_nghe_nghiep as ten_nghe_nghiep
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong k ON s.khoa_id = k.id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON s.khu_vuc_id = kv.id
LEFT JOIN public.mdm_nhan_su ns_gs ON s.nguoi_giam_sat_id = ns_gs.id
LEFT JOIN public.mdm_nhan_su ns_nv ON s.nhan_vien_id = ns_nv.id
LEFT JOIN public.dm_nghe_nghiep nn ON s.nghe_nghiep_id = nn.id;

GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;
