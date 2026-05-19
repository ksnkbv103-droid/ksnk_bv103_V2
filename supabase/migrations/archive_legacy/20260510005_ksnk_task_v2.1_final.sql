-- =====================================================
-- KSNK-Task v2.1 - Migration Hoàn Chỉnh (CASCADE fix)
-- =====================================================

-- 0. Xóa View cũ và tất cả các view phụ thuộc (CASCADE)
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

-- 1. Bảng công việc chính
CREATE TABLE IF NOT EXISTS public.fact_cong_viec (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de                 TEXT NOT NULL,
    mo_ta                   TEXT,
    loai_pham_vi            TEXT NOT NULL CHECK (loai_pham_vi IN ('NOI_BO', 'MANG_LUOI')),
    loai_cong_viec          TEXT NOT NULL CHECK (loai_cong_viec IN ('DINH_KY', 'DOT_XUAT', 'KHAN_CAP')),
    muc_do_uu_tien          TEXT DEFAULT 'TRUNG_BINH' CHECK (muc_do_uu_tien IN ('CAO', 'TRUNG_BINH', 'THAP')),
    trang_thai              TEXT DEFAULT 'CHUA_BAT_DAU' CHECK (trang_thai IN ('CHUA_BAT_DAU', 'DANG_THUC_HIEN', 'HOAN_THANH', 'QUA_HAN', 'DA_HUY')),
    han_hoan_thanh          DATE,
    nguoi_tao_id            UUID REFERENCES mdm_nhan_su(id),
    nguoi_phu_trach_id      UUID REFERENCES mdm_nhan_su(id),
    khoa_thuc_hien_id       UUID REFERENCES dm_khoa_phong(id),
    to_cong_tac_id          UUID REFERENCES dm_to_cong_tac(id),
    cong_viec_cha_id        UUID REFERENCES fact_cong_viec(id) ON DELETE CASCADE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng hoạt động
CREATE TABLE IF NOT EXISTS public.fact_cong_viec_hoat_dong (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cong_viec            UUID NOT NULL REFERENCES fact_cong_viec(id) ON DELETE CASCADE,
    loai_hoat_dong          TEXT NOT NULL CHECK (loai_hoat_dong IN ('PHAN_CONG', 'DE_XUAT', 'BAO_CAO_TIEN_DO', 'PHE_DUYET', 'CAP_NHAT', 'HOAN_THANH')),
    nguoi_thuc_hien_id      UUID REFERENCES mdm_nhan_su(id),
    trang_thai              TEXT,
    noi_dung                TEXT,
    phan_tram_hoan_thanh    INT DEFAULT 0 CHECK (phan_tram_hoan_thanh BETWEEN 0 AND 100),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo lại View gốc
CREATE OR REPLACE VIEW public.v_fact_cong_viec_full AS
SELECT 
    cv.*,
    ns_tao.ho_ten as nguoi_tao_ten,
    ns_phu.ho_ten as nguoi_phu_trach_ten,
    k.ten_khoa as khoa_thuc_hien_ten,
    (cv.han_hoan_thanh < CURRENT_DATE AND cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')) as is_qua_han
FROM fact_cong_viec cv
LEFT JOIN mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id;

-- 4. Tạo lại View phụ thuộc (v_cong_viec_qua_han)
CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
SELECT * FROM public.v_fact_cong_viec_full WHERE is_qua_han = true;

-- 5. Phân quyền
GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role;
ALTER TABLE public.fact_cong_viec ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for auth users" ON public.fact_cong_viec;
CREATE POLICY "Allow all for auth users" ON public.fact_cong_viec FOR ALL USING (true);
