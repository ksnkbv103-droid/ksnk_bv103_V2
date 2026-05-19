-- =====================================================
-- KSNK-Task v2.1 - Migration Hoàn Chỉnh (Đúng chuẩn BV103)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng công việc chính
CREATE TABLE IF NOT EXISTS public.fact_cong_viec (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_cong_viec           TEXT NOT NULL,
    mo_ta                   TEXT,
    ma_loai_pham_vi         TEXT NOT NULL CHECK (ma_loai_pham_vi IN ('NOI_BO', 'MANG_LUOI')),
    ma_loai_cong_viec       TEXT NOT NULL CHECK (ma_loai_cong_viec IN ('DINH_KY', 'DOT_XUAT', 'KHAN_CAP')),
    ma_uu_tien              TEXT DEFAULT 'TRUNG_BINH' CHECK (ma_uu_tien IN ('CAO', 'TRUNG_BINH', 'THAP')),
    ma_trang_thai           TEXT DEFAULT 'CHUA_BAT_DAU' CHECK (ma_trang_thai IN ('CHUA_BAT_DAU', 'DANG_THUC_HIEN', 'HOAN_THANH', 'QUA_HAN', 'DA_HUY')),
    ngay_han_hoan_thanh     DATE,
    nguoi_tao_id            UUID REFERENCES public.mdm_nhan_su(id),
    nguoi_phu_trach_id      UUID REFERENCES public.mdm_nhan_su(id),
    khoa_thuc_hien_id       UUID REFERENCES public.dm_khoa_phong(id),
    to_cong_tac_id          UUID REFERENCES public.dm_to_cong_tac(id),
    cong_viec_cha_id        UUID REFERENCES public.fact_cong_viec(id) ON DELETE CASCADE,
    
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung cột v2 khi `fact_cong_viec` đã tồn tại từ schema cũ (CREATE TABLE IF NOT EXISTS bỏ qua, không thêm cột mới).
ALTER TABLE public.fact_cong_viec
  ADD COLUMN IF NOT EXISTS ma_trang_thai TEXT DEFAULT 'CHUA_BAT_DAU';

-- 2. Bảng hoạt động (Timeline)
CREATE TABLE IF NOT EXISTS public.fact_cong_viec_hoat_dong (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cong_viec            UUID NOT NULL REFERENCES public.fact_cong_viec(id) ON DELETE CASCADE,
    loai_hoat_dong          TEXT NOT NULL CHECK (loai_hoat_dong IN ('PHAN_CONG', 'DE_XUAT', 'BAO_CAO_TIEN_DO', 'PHE_DUYET', 'CAP_NHAT', 'HOAN_THANH')),
    nguoi_thuc_hien_id      UUID REFERENCES public.mdm_nhan_su(id),
    ma_trang_thai_moi       TEXT,
    noi_dung                TEXT,
    phan_tram_hoan_thanh    INT DEFAULT 0 CHECK (phan_tram_hoan_thanh BETWEEN 0 AND 100),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng file
CREATE TABLE IF NOT EXISTS public.fact_cong_viec_file (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_hoat_dong            UUID NOT NULL REFERENCES public.fact_cong_viec_hoat_dong(id) ON DELETE CASCADE,
    file_url                TEXT NOT NULL,
    ten_file                TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_fact_cv_hoat_dong_cv ON public.fact_cong_viec_hoat_dong(id_cong_viec);
CREATE INDEX IF NOT EXISTS idx_fact_cv_trang_thai ON public.fact_cong_viec(ma_trang_thai);

-- 5–6. RLS + view: chỉ khi `fact_cong_viec` đã theo model task v2 (tránh schema cũ remote — không có ma_loai_pham_vi / nguoi_tao_id / ngay_han_hoan_thanh).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fact_cong_viec' AND column_name = 'ma_loai_pham_vi'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fact_cong_viec' AND column_name = 'nguoi_tao_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fact_cong_viec' AND column_name = 'ngay_han_hoan_thanh'
  ) THEN
    ALTER TABLE public.fact_cong_viec ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users view relevant tasks" ON public.fact_cong_viec;
    CREATE POLICY "Users view relevant tasks" ON public.fact_cong_viec FOR SELECT
    USING (
      nguoi_tao_id IN (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = auth.uid()) OR
      nguoi_phu_trach_id IN (SELECT id FROM public.mdm_nhan_su WHERE auth_user_id = auth.uid()) OR
      ma_loai_pham_vi = 'MANG_LUOI'
    );

    CREATE OR REPLACE VIEW public.v_fact_cong_viec_full AS
    SELECT
      cv.*,
      ns_tao.ho_ten AS ten_nguoi_tao,
      ns_phu.ho_ten AS ten_nguoi_phu_trach,
      k.ten_khoa AS ten_khoa_thuc_hien,
      (cv.ngay_han_hoan_thanh < CURRENT_DATE AND cv.ma_trang_thai != 'HOAN_THANH') AS is_qua_han
    FROM public.fact_cong_viec cv
    LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
    LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
    LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
    WHERE cv.is_active = true;

    GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
  ELSE
    RAISE NOTICE 'fact_cong_viec: bỏ qua RLS/view task v2 — schema cũ (chưa đủ cột v2).';
  END IF;
END $$;
