-- KSNK Task 2.0: Schema Fix & Performance Indexes
-- Adhering to Healthcare Performance Standards (Rule 5b)

-- 1. Schema Fix: Add missing priority column
ALTER TABLE public.fact_cong_viec ADD COLUMN IF NOT EXISTS ma_uu_tien text DEFAULT 'TRUNG_BINH';

-- 2. Task Management Optimization (Indexes for frequently filtered columns)
CREATE INDEX IF NOT EXISTS idx_cong_viec_ma_trang_thai ON public.fact_cong_viec(ma_trang_thai);
CREATE INDEX IF NOT EXISTS idx_cong_viec_nguoi_thuc_hien ON public.fact_cong_viec(nguoi_thuc_hien_viec_id);
CREATE INDEX IF NOT EXISTS idx_cong_viec_ma_uu_tien ON public.fact_cong_viec(ma_uu_tien);
CREATE INDEX IF NOT EXISTS idx_cong_viec_da_xem ON public.fact_cong_viec(nguoi_nhan_da_xem);

-- 3. Supervision Optimization (Common bottleneck: filtering by supervisor)
CREATE INDEX IF NOT EXISTS idx_giam_sat_vst_supervisor ON public.fact_giam_sat_vst_sessions(nguoi_giam_sat_id);
CREATE INDEX IF NOT EXISTS idx_giam_sat_chung_supervisor ON public.fact_giam_sat_chung_sessions(nguoi_giam_sat_id);

-- 4. Update View to include ma_uu_tien
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
CREATE OR REPLACE VIEW public.v_fact_cong_viec_full AS
SELECT 
    cv.id,
    cv.ma_cong_viec,
    cv.ten_cong_viec,
    cv.mo_ta,
    cv.ma_trang_thai,
    cv.tien_do,
    cv.ma_loai_cong_viec,
    cv.ma_uu_tien,
    cv.khoa_thuc_hien_id,
    cv.to_cong_tac_id,
    cv.nguoi_giao_viec_id,
    cv.nguoi_thuc_hien_viec_id,
    cv.nguoi_de_xuat_viec_id,
    cv.ngay_han_chot,
    cv.ngay_hoan_thanh,
    cv.ket_qua_tong_hop,
    cv.minh_chung,
    cv.cong_viec_cha_id,
    cv.nguoi_nhan_da_xem,
    cv.da_xem_at,
    cv.is_active,
    cv.created_at,
    cv.updated_at,
    -- JOINed Human-readable info
    ns_giao.ho_ten as ten_nguoi_giao,
    ns_thuc.ho_ten as ten_nguoi_thuc_hien,
    ns_dexuat.ho_ten as ten_nguoi_de_xuat,
    k.ten_khoa as ten_khoa_thuc_hien,
    t.ten_to as ten_to_cong_tac
FROM public.fact_cong_viec cv
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_nhan_su ns_thuc ON cv.nguoi_thuc_hien_viec_id = ns_thuc.id
LEFT JOIN public.mdm_nhan_su ns_dexuat ON cv.nguoi_de_xuat_viec_id = ns_dexuat.id
LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;

ANALYZE public.fact_cong_viec;
ANALYZE public.fact_giam_sat_vst_sessions;
ANALYZE public.fact_giam_sat_chung_sessions;
