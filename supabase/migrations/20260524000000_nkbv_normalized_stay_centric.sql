-- Migration: 20260524000000_nkbv_normalized_stay_centric.sql
-- Description: Tái cấu trúc toàn diện & đồng bộ đặt tên tiền tố module nkbv_

-- 1. Xóa bỏ các view và bảng cũ nếu tồn tại
DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_nkbv_ca_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_nkbv_su_kien_full CASCADE;

DROP TABLE IF EXISTS public.fact_giam_sat_nkbv_ca CASCADE;
DROP TABLE IF EXISTS public.fact_vi_sinh_records CASCADE;
DROP TABLE IF EXISTS public.fact_stay_nkbv CASCADE;

DROP TABLE IF EXISTS public.fact_nkbv_su_kien CASCADE;
DROP TABLE IF EXISTS public.fact_nkbv_vi_sinh CASCADE;
DROP TABLE IF EXISTS public.fact_nkbv_benh_an CASCADE;

-- 2. Tạo bảng Bệnh án vật lý: fact_nkbv_benh_an
CREATE TABLE public.fact_nkbv_benh_an (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_benh_an text NOT NULL,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_ra_vien timestamp with time zone,
    ket_cuc_dieu_tri text,
    ly_do_tu_vong text,
    tu_vong_lien_quan_nkbv boolean,
    khoa_dieu_tri_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fact_nkbv_benh_an_pkey PRIMARY KEY (id),
    CONSTRAINT fact_nkbv_benh_an_ma_benh_an_key UNIQUE (ma_benh_an),
    CONSTRAINT fact_nkbv_benh_an_khoa_dieu_tri_fkey FOREIGN KEY (khoa_dieu_tri_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Enable RLS for fact_nkbv_benh_an
ALTER TABLE public.fact_nkbv_benh_an ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_nkbv_benh_an_select ON public.fact_nkbv_benh_an FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_nkbv_benh_an_insert ON public.fact_nkbv_benh_an FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_nkbv_benh_an_update ON public.fact_nkbv_benh_an FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_nkbv_benh_an_delete ON public.fact_nkbv_benh_an FOR DELETE TO authenticated USING (true);

-- 3. Tạo bảng vi sinh LIS dương tính thô: fact_nkbv_vi_sinh
CREATE TABLE public.fact_nkbv_vi_sinh (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_benh_nhan text NOT NULL,
    ma_benh_an text NOT NULL,
    ma_benh_pham text,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_lay_mau timestamp with time zone NOT NULL,
    khoa_yeu_cau_id uuid,
    loai_benh_pham text NOT NULL,
    tac_nhan text NOT NULL,
    ket_qua_duong_tinh boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fact_nkbv_vi_sinh_pkey PRIMARY KEY (id),
    CONSTRAINT fact_nkbv_vi_sinh_khoa_yeu_cau_fkey FOREIGN KEY (khoa_yeu_cau_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fact_nkbv_vi_sinh_ma_benh_an_fkey FOREIGN KEY (ma_benh_an) 
        REFERENCES public.fact_nkbv_benh_an(ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_nkbv_vi_sinh_ngay_lay ON public.fact_nkbv_vi_sinh(ngay_lay_mau DESC);
CREATE INDEX idx_nkbv_vi_sinh_ma_bn ON public.fact_nkbv_vi_sinh(ma_benh_nhan);
CREATE INDEX idx_nkbv_vi_sinh_ma_ba ON public.fact_nkbv_vi_sinh(ma_benh_an);
CREATE UNIQUE INDEX idx_nkbv_vi_sinh_unique_key ON public.fact_nkbv_vi_sinh((metadata->>'unique_key')) WHERE is_active = true;

-- Enable RLS for fact_nkbv_vi_sinh
ALTER TABLE public.fact_nkbv_vi_sinh ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_nkbv_vi_sinh_select ON public.fact_nkbv_vi_sinh FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_nkbv_vi_sinh_insert ON public.fact_nkbv_vi_sinh FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_nkbv_vi_sinh_update ON public.fact_nkbv_vi_sinh FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_nkbv_vi_sinh_delete ON public.fact_nkbv_vi_sinh FOR DELETE TO authenticated USING (true);

-- 4. Tạo bảng Sự kiện nhiễm khuẩn: fact_nkbv_su_kien
CREATE TABLE public.fact_nkbv_su_kien (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_ca text NOT NULL,
    khoa_ghi_nhan_id uuid,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone,
    ngay_phat_hien date NOT NULL,
    vi_tri_nhiem_khuan text,
    tac_nhan_vi_khuan text,
    clinical_notes jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    vi_sinh_record_id uuid,
    verification_data jsonb DEFAULT '{}'::jsonb,
    loai_nkbv_id uuid NOT NULL,
    trang_thai_id uuid NOT NULL,
    nguoi_ghi_id uuid,
    ma_benh_an text,
    ma_benh_pham text,
    CONSTRAINT fact_nkbv_su_kien_pkey PRIMARY KEY (id),
    CONSTRAINT fact_nkbv_su_kien_ma_ca_key UNIQUE (ma_ca),
    CONSTRAINT fact_nkbv_su_kien_khoa_ghi_nhan_fkey FOREIGN KEY (khoa_ghi_nhan_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fact_nkbv_su_kien_loai_nkbv_fkey FOREIGN KEY (loai_nkbv_id) 
        REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fact_nkbv_su_kien_trang_thai_fkey FOREIGN KEY (trang_thai_id) 
        REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fact_nkbv_su_kien_nguoi_ghi_fkey FOREIGN KEY (nguoi_ghi_id) 
        REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fact_nkbv_su_kien_vi_sinh_record_fkey FOREIGN KEY (vi_sinh_record_id) 
        REFERENCES public.fact_nkbv_vi_sinh(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fact_nkbv_su_kien_ma_benh_an_fkey FOREIGN KEY (ma_benh_an) 
        REFERENCES public.fact_nkbv_benh_an(ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_nkbv_su_kien_ma_bn ON public.fact_nkbv_su_kien(ma_benh_nhan);
CREATE INDEX idx_nkbv_su_kien_ma_ba ON public.fact_nkbv_su_kien(ma_benh_an);

-- Enable RLS for fact_nkbv_su_kien
ALTER TABLE public.fact_nkbv_su_kien ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_nkbv_su_kien_select ON public.fact_nkbv_su_kien FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_nkbv_su_kien_insert ON public.fact_nkbv_su_kien FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_nkbv_su_kien_update ON public.fact_nkbv_su_kien FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_nkbv_su_kien_delete ON public.fact_nkbv_su_kien FOR DELETE TO authenticated USING (true);

-- 5. Tạo View tổng hợp sự kiện nhiễm khuẩn: v_fact_nkbv_su_kien_full
CREATE OR REPLACE VIEW public.v_fact_nkbv_su_kien_full AS
 SELECT c.id,
    c.ma_ca,
    c.khoa_ghi_nhan_id,
    c.ma_benh_nhan,
    c.ho_ten_benh_nhan,
    c.ngay_sinh,
    c.gioi_tinh,
    c.ngay_vao_vien,
    c.ngay_phat_hien,
    c.vi_tri_nhiem_khuan,
    c.tac_nhan_vi_khuan,
    c.clinical_notes->>'tom_tat_dien_bien' AS tom_tat_dien_bien,
    c.clinical_notes->>'bien_phap_phong_ngua' AS bien_phap_phong_ngua,
    c.loai_nkbv_id,
    c.trang_thai_id,
    c.clinical_notes->>'ly_do_loai_tru' AS ly_do_loai_tru,
    c.nguoi_ghi_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.clinical_notes,
    c.vi_sinh_record_id,
    c.verification_data,
    c.ma_benh_an,
    c.ma_benh_pham,
    s.ngay_ra_vien,
    s.ket_cuc_dieu_tri,
    s.ly_do_tu_vong,
    s.tu_vong_lien_quan_nkbv,
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM ((((public.fact_nkbv_su_kien c
     LEFT JOIN public.fact_nkbv_benh_an s ON ((s.ma_benh_an = c.ma_benh_an)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.dm_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN public.dm_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));
