-- =====================================================
-- KSNK-Task v2.2 - Bổ sung cột thiếu + sửa View
-- =====================================================

-- 1. Thêm cột phan_tram_hoan_thanh vào bảng chính (hiện đang thiếu)
ALTER TABLE public.fact_cong_viec 
ADD COLUMN IF NOT EXISTS phan_tram_hoan_thanh INT DEFAULT 0 
CHECK (phan_tram_hoan_thanh BETWEEN 0 AND 100);

-- 2. Tạo bảng file nếu chưa có
CREATE TABLE IF NOT EXISTS public.fact_cong_viec_file (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hoat_dong            UUID NOT NULL REFERENCES public.fact_cong_viec_hoat_dong(id) ON DELETE CASCADE,
    file_url                TEXT NOT NULL,
    ten_file                TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo lại View v_fact_cong_viec_full (bổ sung tổ công tác + đếm việc con)
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_cong_viec_full AS
SELECT 
    cv.*,
    ns_tao.ho_ten     AS nguoi_tao_ten,
    ns_phu.ho_ten     AS nguoi_phu_trach_ten,
    k.ten_khoa        AS khoa_thuc_hien_ten,
    t.ten_to          AS to_cong_tac_ten,
    (cv.han_hoan_thanh < CURRENT_DATE 
     AND cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')) AS is_qua_han,
    (SELECT count(*) FROM public.fact_cong_viec sub 
     WHERE sub.cong_viec_cha_id = cv.id)                AS cong_viec_con_count
FROM public.fact_cong_viec cv
LEFT JOIN public.mdm_nhan_su   ns_tao ON cv.nguoi_tao_id      = ns_tao.id
LEFT JOIN public.mdm_nhan_su   ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.dm_khoa_phong k      ON cv.khoa_thuc_hien_id  = k.id
LEFT JOIN public.dm_to_cong_tac t     ON cv.to_cong_tac_id     = t.id;

-- 4. View quá hạn (phụ thuộc view trên)
CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
SELECT * FROM public.v_fact_cong_viec_full WHERE is_qua_han = true;

-- 5. Phân quyền
GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role;

-- 6. Index bổ sung
CREATE INDEX IF NOT EXISTS idx_fact_cv_trang_thai ON public.fact_cong_viec(trang_thai);
CREATE INDEX IF NOT EXISTS idx_fact_cv_cha ON public.fact_cong_viec(cong_viec_cha_id);
CREATE INDEX IF NOT EXISTS idx_fact_cv_hd_cv ON public.fact_cong_viec_hoat_dong(id_cong_viec);
