-- Migration: 20260522000011_init_nkbv_surveillance_and_vi_sinh.sql
-- Description: Khởi tạo bảng danh mục CDC baselines, kết quả cấy vi sinh LIS, mẫu số ngày-thiết bị hàng ngày, mẫu số phẫu thuật, cập nhật fact_giam_sat_nkbv_ca, views, và RPCs.

-- 1. Bảng baseline CDC cho SIR/SUR
CREATE TABLE IF NOT EXISTS public.dm_nkbv_cdc_baselines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid, -- Liên kết đến dm_khoa_phong (nếu áp dụng riêng cho khoa, hoặc NULL nếu áp dụng chung toàn viện)
    loai_thiet_bi text NOT NULL CHECK (loai_thiet_bi IN ('CVC', 'FOLEY', 'VENT')),
    expected_infection_rate_per_1000 numeric(10,4) NOT NULL, -- Tỷ suất nhiễm trùng kỳ vọng per 1000 ngày thiết bị
    expected_dur numeric(10,4) NOT NULL, -- Tỷ lệ sử dụng thiết bị kỳ vọng (DUR) per patient-day
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dm_nkbv_cdc_baselines_pkey PRIMARY KEY (id),
    CONSTRAINT dm_nkbv_cdc_baselines_unique UNIQUE (khoa_id, loai_thiet_bi)
);

-- 2. Bảng kết quả vi sinh thô từ LIS
CREATE TABLE IF NOT EXISTS public.fact_vi_sinh_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ngay_sinh date,
    gioi_tinh text,
    ngay_vao_vien timestamp with time zone NOT NULL,
    ngay_lay_mau timestamp with time zone NOT NULL,
    khoa_yeu_cau_id uuid,
    loai_benh_pham text NOT NULL,
    tac_nhan text NOT NULL,
    ket_qua_duong_tinh boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL, -- unique_key = md5(ma_benh_nhan + ngay_lay_mau + loai_benh_pham)
    CONSTRAINT fact_vi_sinh_records_pkey PRIMARY KEY (id),
    CONSTRAINT fact_vi_sinh_records_khoa_yeu_cau_fkey FOREIGN KEY (khoa_yeu_cau_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vi_sinh_ngay_lay ON public.fact_vi_sinh_records(ngay_lay_mau DESC);
CREATE INDEX IF NOT EXISTS idx_vi_sinh_ma_bn ON public.fact_vi_sinh_records(ma_benh_nhan);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vi_sinh_unique_key ON public.fact_vi_sinh_records((metadata->>'unique_key')) WHERE is_active = true;

-- 3. Nâng cấp bảng ca nhiễm khuẩn fact_giam_sat_nkbv_ca
ALTER TABLE public.fact_giam_sat_nkbv_ca
ADD COLUMN IF NOT EXISTS vi_sinh_record_id uuid,
ADD COLUMN IF NOT EXISTS verification_data jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE public.fact_giam_sat_nkbv_ca
DROP CONSTRAINT IF EXISTS giam_sat_nkbv_ca_vi_sinh_fkey,
ADD CONSTRAINT giam_sat_nkbv_ca_vi_sinh_fkey FOREIGN KEY (vi_sinh_record_id)
    REFERENCES public.fact_vi_sinh_records(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. Bảng mẫu số ngày-thiết bị hàng ngày
CREATE TABLE IF NOT EXISTS public.fact_nkbv_mau_so_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid NOT NULL,
    ngay_ghi_nhan date NOT NULL,
    so_ngay_tho_may integer DEFAULT 0 NOT NULL,
    so_ngay_catheter_cvc integer DEFAULT 0 NOT NULL,
    so_ngay_sonde_tieu integer DEFAULT 0 NOT NULL,
    so_ngay_dieu_tri integer DEFAULT 0 NOT NULL, -- Số ngày nằm viện (Patient Days)
    so_dot_tho_may_emv integer DEFAULT 0 NOT NULL, -- Số đợt thở máy EMV (Mechanical Ventilation Episodes)
    nguoi_bao_cao_id uuid, -- ML.KSNK báo cáo hàng ngày
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fact_nkbv_mau_so_daily_pkey PRIMARY KEY (id),
    CONSTRAINT fact_nkbv_mau_so_daily_khoa_fkey FOREIGN KEY (khoa_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fact_nkbv_mau_so_daily_unique_key UNIQUE (khoa_id, ngay_ghi_nhan)
);

CREATE INDEX IF NOT EXISTS idx_nkbv_mau_so_daily_date ON public.fact_nkbv_mau_so_daily(ngay_ghi_nhan DESC);

-- 5. Bảng mẫu số ca phẫu thuật cho SSI
CREATE TABLE IF NOT EXISTS public.fact_nkbv_mau_so_phau_thuat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    khoa_id uuid NOT NULL, -- Khoa thực hiện phẫu thuật
    ngay_phau_thuat date NOT NULL,
    ma_benh_nhan text NOT NULL,
    ho_ten_benh_nhan text NOT NULL,
    ten_phau_thuat text NOT NULL,
    loai_phau_thuat_nhsn text NOT NULL, -- Ví dụ: COLO, KPRO, HPRO, CARD
    phan_loai_vet_mo text NOT NULL CHECK (phan_loai_vet_mo IN ('SACH', 'SACH_NHIEM', 'NHIEM', 'BAN')),
    co_dat_implant boolean DEFAULT false NOT NULL,
    asa_score integer CHECK (asa_score BETWEEN 1 AND 5), -- Điểm chỉ số thể trạng ASA
    thoi_gian_mo_phut integer NOT NULL, -- Thời gian phẫu thuật thực tế
    thoi_gian_nguong_nhsn integer DEFAULT 120 NOT NULL, -- Ngưỡng thời gian chuẩn của NHSN
    is_laparoscopic boolean DEFAULT false NOT NULL, -- Phẫu thuật nội soi
    expected_ssi_prob numeric(6,5) DEFAULT 0.01500 NOT NULL, -- Xác suất SSI dự đoán (Tính từ thuật toán logistic)
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fact_nkbv_mau_so_phau_thuat_pkey PRIMARY KEY (id),
    CONSTRAINT fact_nkbv_mau_so_pt_khoa_fkey FOREIGN KEY (khoa_id) 
        REFERENCES public.dm_khoa_phong(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nkbv_mau_so_pt_ngay ON public.fact_nkbv_mau_so_phau_thuat(ngay_phau_thuat DESC);

-- 6. Tái tạo View v_fact_giam_sat_nkbv_ca_full bao gồm cả các cột mới
DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_nkbv_ca_full AS
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
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM (((public.fact_giam_sat_nkbv_ca c
     LEFT JOIN dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN dm_lookup_value l ON (((l.id = c.loai_nkbv_id) AND (l.category_type = 'LOAI_NKBV'::text))))
     LEFT JOIN dm_lookup_value t ON (((t.id = c.trang_thai_id) AND (t.category_type = 'TRANG_THAI_NKBV_CA'::text))));

-- 7. SQL View Tổng hợp Dịch tễ học Lũy kế (v_nkbv_dich_te_hoc_rates)
DROP VIEW IF EXISTS public.v_nkbv_dich_te_hoc_rates CASCADE;

CREATE OR REPLACE VIEW public.v_nkbv_dich_te_hoc_rates AS
WITH ca_counts AS (
    SELECT 
        khoa_ghi_nhan_id,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'VAP') AS vap_cases,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'VAE') AS vae_cases,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'BSI' AND (verification_data->>'classification') = 'CLABSI') AS clabsi_cases,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'BSI' AND (verification_data->>'classification') = 'MBI_LCBI') AS mbi_lcbi_cases,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'UTI' AND (verification_data->>'is_cauti') = 'true') AS cauti_cases,
        COUNT(id) FILTER (WHERE vi_tri_nhiem_khuan = 'SSI') AS ssi_cases
    FROM public.fact_giam_sat_nkbv_ca
    WHERE is_active = true AND trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
    GROUP BY khoa_ghi_nhan_id
),
mau_so_sums AS (
    SELECT 
        khoa_id,
        SUM(so_ngay_tho_may) AS total_vent_days,
        SUM(so_ngay_catheter_cvc) AS total_cvc_days,
        SUM(so_ngay_sonde_tieu) AS total_foley_days,
        SUM(so_ngay_dieu_tri) AS total_patient_days,
        SUM(so_dot_tho_may_emv) AS total_emv_episodes
    FROM public.fact_nkbv_mau_so_daily
    GROUP BY khoa_id
),
baselines AS (
    SELECT 
        khoa_id,
        MAX(expected_infection_rate_per_1000) FILTER (WHERE loai_thiet_bi = 'VENT') AS b_vap_rate,
        MAX(expected_dur) FILTER (WHERE loai_thiet_bi = 'VENT') AS b_vent_dur,
        MAX(expected_infection_rate_per_1000) FILTER (WHERE loai_thiet_bi = 'CVC') AS b_clabsi_rate,
        MAX(expected_dur) FILTER (WHERE loai_thiet_bi = 'CVC') AS b_cvc_dur,
        MAX(expected_infection_rate_per_1000) FILTER (WHERE loai_thiet_bi = 'FOLEY') AS b_cauti_rate,
        MAX(expected_dur) FILTER (WHERE loai_thiet_bi = 'FOLEY') AS b_foley_dur
    FROM public.dm_nkbv_cdc_baselines
    WHERE is_active = true
    GROUP BY khoa_id
),
ssi_sums AS (
    SELECT 
        khoa_id,
        COUNT(id) AS total_surgeries,
        SUM(expected_ssi_prob) AS expected_ssi_cases
    FROM public.fact_nkbv_mau_so_phau_thuat
    WHERE is_active = true
    GROUP BY khoa_id
)
SELECT 
    k.id AS khoa_id,
    k.ma_khoa,
    k.ten_khoa,
    -- 1. Thống kê ca bệnh thực tế (Observed)
    COALESCE(c.vap_cases, 0) AS obs_vap_cases,
    COALESCE(c.vae_cases, 0) AS obs_vae_cases,
    COALESCE(c.clabsi_cases, 0) AS obs_clabsi_cases,
    COALESCE(c.mbi_lcbi_cases, 0) AS obs_mbi_lcbi_cases,
    COALESCE(c.cauti_cases, 0) AS obs_cauti_cases,
    COALESCE(c.ssi_cases, 0) AS obs_ssi_cases,
    -- 2. Thống kê mẫu số thực tế (Observed Denominators)
    COALESCE(m.total_vent_days, 0) AS obs_vent_days,
    COALESCE(m.total_cvc_days, 0) AS obs_cvc_days,
    COALESCE(m.total_foley_days, 0) AS obs_foley_days,
    COALESCE(m.total_patient_days, 0) AS obs_patient_days,
    COALESCE(m.total_emv_episodes, 0) AS obs_emv_episodes,
    COALESCE(s.total_surgeries, 0) AS obs_total_surgeries,

    -- 3. NHÓM CHỈ SỐ NHIỄM KHUẨN HUYẾT
    CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.clabsi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END AS clabsi_rate_per_1000,
    CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.mbi_lcbi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END AS mbi_lcbi_rate_per_1000,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_cvc_days::numeric / m.total_patient_days, 4) ELSE 0 END AS cvc_dur,
    CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 AND COALESCE(b.b_clabsi_rate, 0) > 0 
         THEN ROUND(COALESCE(c.clabsi_cases, 0)::numeric / ((m.total_cvc_days * b.b_clabsi_rate) / 1000), 2) ELSE 0 END AS clabsi_sir,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_cvc_dur, 0) > 0 
         THEN ROUND(m.total_cvc_days::numeric / (m.total_patient_days * b.b_cvc_dur), 2) ELSE 0 END AS cvc_sur,

    -- 4. NHÓM CHỈ SỐ VAE & VAP
    CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vap_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END AS vap_rate_per_1000,
    CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END AS vae_rate_per_1000,
    CASE WHEN COALESCE(m.total_emv_episodes, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_emv_episodes) * 100, 2) ELSE 0 END AS vae_rate_per_100_emv,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_vent_days::numeric / m.total_patient_days, 4) ELSE 0 END AS vent_dur,
    CASE WHEN COALESCE(m.total_vent_days, 0) > 0 AND COALESCE(b.b_vap_rate, 0) > 0 
         THEN ROUND(COALESCE(c.vae_cases, 0)::numeric / ((m.total_vent_days * b.b_vap_rate) / 1000), 2) ELSE 0 END AS vae_sir,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_vent_dur, 0) > 0 
         THEN ROUND(m.total_vent_days::numeric / (m.total_patient_days * b.b_vent_dur), 2) ELSE 0 END AS vent_sur,

    -- 5. NHÓM CHỈ SỐ CAUTI
    CASE WHEN COALESCE(m.total_foley_days, 0) > 0 THEN ROUND((COALESCE(c.cauti_cases, 0)::numeric / m.total_foley_days) * 1000, 2) ELSE 0 END AS cauti_rate_per_1000,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_foley_days::numeric / m.total_patient_days, 4) ELSE 0 END AS foley_dur,
    CASE WHEN COALESCE(m.total_foley_days, 0) > 0 AND COALESCE(b.b_cauti_rate, 0) > 0 
         THEN ROUND(COALESCE(c.cauti_cases, 0)::numeric / ((m.total_foley_days * b.b_cauti_rate) / 1000), 2) ELSE 0 END AS cauti_sir,
    CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_foley_dur, 0) > 0 
         THEN ROUND(m.total_foley_days::numeric / (m.total_patient_days * b.b_foley_dur), 2) ELSE 0 END AS foley_sur,

    -- 6. NHÓM CHỈ SỐ SSI
    CASE WHEN COALESCE(s.total_surgeries, 0) > 0 THEN ROUND((COALESCE(c.ssi_cases, 0)::numeric / s.total_surgeries) * 100, 2) ELSE 0 END AS ssi_raw_rate,
    CASE WHEN COALESCE(s.expected_ssi_cases, 0) > 0 THEN ROUND(COALESCE(c.ssi_cases, 0)::numeric / s.expected_ssi_cases, 2) ELSE 0 END AS ssi_sir

FROM public.dm_khoa_phong k
LEFT JOIN ca_counts c ON k.id = c.khoa_ghi_nhan_id
LEFT JOIN mau_so_sums m ON k.id = m.khoa_id
LEFT JOIN baselines b ON k.id = b.khoa_id
LEFT JOIN ssi_sums s ON k.id = s.khoa_id
WHERE k.is_active = true;

-- 8. SQL View SSI Tỷ lệ theo từng loại Phẫu thuật (v_nkbv_ssi_rates_by_surgery)
DROP VIEW IF EXISTS public.v_nkbv_ssi_rates_by_surgery CASCADE;

CREATE OR REPLACE VIEW public.v_nkbv_ssi_rates_by_surgery AS
WITH ssi_cases AS (
    SELECT 
        (verification_data->>'loai_phau_thuat_nhsn')::text AS loai_phau_thuat_nhsn,
        COUNT(id) AS obs_ssi_cases
    FROM public.fact_giam_sat_nkbv_ca
    WHERE is_active = true 
      AND vi_tri_nhiem_khuan = 'SSI'
      AND trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
    GROUP BY (verification_data->>'loai_phau_thuat_nhsn')
),
surgeries AS (
    SELECT 
        loai_phau_thuat_nhsn::text AS loai_phau_thuat_nhsn,
        COUNT(id) AS total_surgeries,
        SUM(expected_ssi_prob) AS expected_ssi_cases
    FROM public.fact_nkbv_mau_so_phau_thuat
    WHERE is_active = true
    GROUP BY loai_phau_thuat_nhsn
)
SELECT 
    COALESCE(s.loai_phau_thuat_nhsn, c.loai_phau_thuat_nhsn) AS loai_phau_thuat_nhsn,
    COALESCE(s.total_surgeries, 0)::bigint AS total_surgeries,
    COALESCE(c.obs_ssi_cases, 0)::bigint AS obs_ssi_cases,
    COALESCE(s.expected_ssi_cases, 0)::numeric AS expected_ssi_cases,
    CASE WHEN COALESCE(s.total_surgeries, 0) > 0 THEN ROUND((COALESCE(c.obs_ssi_cases, 0)::numeric / s.total_surgeries) * 100, 2) ELSE 0 END::numeric AS ssi_raw_rate,
    CASE WHEN COALESCE(s.expected_ssi_cases, 0) > 0 THEN ROUND(COALESCE(c.obs_ssi_cases, 0)::numeric / s.expected_ssi_cases, 2) ELSE 0 END::numeric AS ssi_sir
FROM surgeries s
FULL OUTER JOIN ssi_cases c ON s.loai_phau_thuat_nhsn = c.loai_phau_thuat_nhsn;

-- 9. PostgreSQL RPC phục vụ lọc khoảng thời gian động (fn_nkbv_dich_te_hoc_rates)
CREATE OR REPLACE FUNCTION public.fn_nkbv_dich_te_hoc_rates(
    p_tu_ngay date,
    p_den_ngay date,
    p_khoa_id uuid DEFAULT NULL
)
RETURNS TABLE (
    khoa_id uuid,
    ma_khoa text,
    ten_khoa text,
    obs_vap_cases bigint,
    obs_vae_cases bigint,
    obs_clabsi_cases bigint,
    obs_mbi_lcbi_cases bigint,
    obs_cauti_cases bigint,
    obs_ssi_cases bigint,
    obs_vent_days bigint,
    obs_cvc_days bigint,
    obs_foley_days bigint,
    obs_patient_days bigint,
    obs_emv_episodes bigint,
    obs_total_surgeries bigint,
    clabsi_rate_per_1000 numeric,
    mbi_lcbi_rate_per_1000 numeric,
    cvc_dur numeric,
    clabsi_sir numeric,
    cvc_sur numeric,
    vap_rate_per_1000 numeric,
    vae_rate_per_1000 numeric,
    vae_rate_per_100_emv numeric,
    vent_dur numeric,
    vae_sir numeric,
    vent_sur numeric,
    cauti_rate_per_1000 numeric,
    foley_dur numeric,
    cauti_sir numeric,
    foley_sur numeric,
    ssi_raw_rate numeric,
    ssi_sir numeric
) 
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    WITH ca_counts AS (
        SELECT 
            c.khoa_ghi_nhan_id,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'VAP') AS vap_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'VAE') AS vae_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'BSI' AND (c.verification_data->>'classification') = 'CLABSI') AS clabsi_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'BSI' AND (c.verification_data->>'classification') = 'MBI_LCBI') AS mbi_lcbi_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'UTI' AND (c.verification_data->>'is_cauti') = 'true') AS cauti_cases,
            COUNT(c.id) FILTER (WHERE c.vi_tri_nhiem_khuan = 'SSI') AS ssi_cases
        FROM public.fact_giam_sat_nkbv_ca c
        WHERE c.is_active = true 
          AND c.ngay_phat_hien >= p_tu_ngay 
          AND c.ngay_phat_hien <= p_den_ngay
          AND c.trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
        GROUP BY c.khoa_ghi_nhan_id
    ),
    mau_so_sums AS (
        SELECT 
            m.khoa_id,
            SUM(m.so_ngay_tho_may) AS total_vent_days,
            SUM(m.so_ngay_catheter_cvc) AS total_cvc_days,
            SUM(m.so_ngay_sonde_tieu) AS total_foley_days,
            SUM(m.so_ngay_dieu_tri) AS total_patient_days,
            SUM(m.so_dot_tho_may_emv) AS total_emv_episodes
        FROM public.fact_nkbv_mau_so_daily m
        WHERE m.ngay_ghi_nhan >= p_tu_ngay AND m.ngay_ghi_nhan <= p_den_ngay
        GROUP BY m.khoa_id
    ),
    baselines AS (
        SELECT 
            b.khoa_id,
            MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'VENT') AS b_vap_rate,
            MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'VENT') AS b_vent_dur,
            MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'CVC') AS b_clabsi_rate,
            MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'CVC') AS b_cvc_dur,
            MAX(b.expected_infection_rate_per_1000) FILTER (WHERE b.loai_thiet_bi = 'FOLEY') AS b_cauti_rate,
            MAX(b.expected_dur) FILTER (WHERE b.loai_thiet_bi = 'FOLEY') AS b_foley_dur
        FROM public.dm_nkbv_cdc_baselines b
        WHERE b.is_active = true
        GROUP BY b.khoa_id
    ),
    ssi_sums AS (
        SELECT 
            s.khoa_id,
            COUNT(s.id) AS total_surgeries,
            SUM(s.expected_ssi_prob) AS expected_ssi_cases
        FROM public.fact_nkbv_mau_so_phau_thuat s
        WHERE s.is_active = true 
          AND s.ngay_phau_thuat >= p_tu_ngay 
          AND s.ngay_phau_thuat <= p_den_ngay
        GROUP BY s.khoa_id
    )
    SELECT 
        k.id AS khoa_id,
        k.ma_khoa::text,
        k.ten_khoa::text,
        COALESCE(c.vap_cases, 0)::bigint AS obs_vap_cases,
        COALESCE(c.vae_cases, 0)::bigint AS obs_vae_cases,
        COALESCE(c.clabsi_cases, 0)::bigint AS obs_clabsi_cases,
        COALESCE(c.mbi_lcbi_cases, 0)::bigint AS obs_mbi_lcbi_cases,
        COALESCE(c.cauti_cases, 0)::bigint AS obs_cauti_cases,
        COALESCE(c.ssi_cases, 0)::bigint AS obs_ssi_cases,
        COALESCE(m.total_vent_days, 0)::bigint AS obs_vent_days,
        COALESCE(m.total_cvc_days, 0)::bigint AS obs_cvc_days,
        COALESCE(m.total_foley_days, 0)::bigint AS obs_foley_days,
        COALESCE(m.total_patient_days, 0)::bigint AS obs_patient_days,
        COALESCE(m.total_emv_episodes, 0)::bigint AS obs_emv_episodes,
        COALESCE(s.total_surgeries, 0)::bigint AS obs_total_surgeries,

        -- CLABSI rates
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.clabsi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END::numeric AS clabsi_rate_per_1000,
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 THEN ROUND((COALESCE(c.mbi_lcbi_cases, 0)::numeric / m.total_cvc_days) * 1000, 2) ELSE 0 END::numeric AS mbi_lcbi_rate_per_1000,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_cvc_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS cvc_dur,
        CASE WHEN COALESCE(m.total_cvc_days, 0) > 0 AND COALESCE(b.b_clabsi_rate, 0) > 0 
             THEN ROUND(COALESCE(c.clabsi_cases, 0)::numeric / ((m.total_cvc_days * b.b_clabsi_rate) / 1000), 2) ELSE 0 END::numeric AS clabsi_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_cvc_dur, 0) > 0 
             THEN ROUND(m.total_cvc_days::numeric / (m.total_patient_days * b.b_cvc_dur), 2) ELSE 0 END::numeric AS cvc_sur,

        -- VAE & VAP rates
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vap_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END::numeric AS vap_rate_per_1000,
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_vent_days) * 1000, 2) ELSE 0 END::numeric AS vae_rate_per_1000,
        CASE WHEN COALESCE(m.total_emv_episodes, 0) > 0 THEN ROUND((COALESCE(c.vae_cases, 0)::numeric / m.total_emv_episodes) * 100, 2) ELSE 0 END::numeric AS vae_rate_per_100_emv,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_vent_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS vent_dur,
        CASE WHEN COALESCE(m.total_vent_days, 0) > 0 AND COALESCE(b.b_vap_rate, 0) > 0 
             THEN ROUND(COALESCE(c.vae_cases, 0)::numeric / ((m.total_vent_days * b.b_vap_rate) / 1000), 2) ELSE 0 END::numeric AS vae_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_vent_dur, 0) > 0 
             THEN ROUND(m.total_vent_days::numeric / (m.total_patient_days * b.b_vent_dur), 2) ELSE 0 END::numeric AS vent_sur,

        -- CAUTI rates
        CASE WHEN COALESCE(m.total_foley_days, 0) > 0 THEN ROUND((COALESCE(c.cauti_cases, 0)::numeric / m.total_foley_days) * 1000, 2) ELSE 0 END::numeric AS cauti_rate_per_1000,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 THEN ROUND(m.total_foley_days::numeric / m.total_patient_days, 4) ELSE 0 END::numeric AS foley_dur,
        CASE WHEN COALESCE(m.total_foley_days, 0) > 0 AND COALESCE(b.b_cauti_rate, 0) > 0 
             THEN ROUND(COALESCE(c.cauti_cases, 0)::numeric / ((m.total_foley_days * b.b_cauti_rate) / 1000), 2) ELSE 0 END::numeric AS cauti_sir,
        CASE WHEN COALESCE(m.total_patient_days, 0) > 0 AND COALESCE(b.b_foley_dur, 0) > 0 
             THEN ROUND(m.total_foley_days::numeric / (m.total_patient_days * b.b_foley_dur), 2) ELSE 0 END::numeric AS foley_sur,

        -- SSI rates
        CASE WHEN COALESCE(s.total_surgeries, 0) > 0 THEN ROUND((COALESCE(c.ssi_cases, 0)::numeric / s.total_surgeries) * 100, 2) ELSE 0 END::numeric AS ssi_raw_rate,
        CASE WHEN COALESCE(s.expected_ssi_cases, 0) > 0 THEN ROUND(COALESCE(c.ssi_cases, 0)::numeric / s.expected_ssi_cases, 2) ELSE 0 END::numeric AS ssi_sir

    FROM public.dm_khoa_phong k
    LEFT JOIN ca_counts c ON k.id = c.khoa_ghi_nhan_id
    LEFT JOIN mau_so_sums m ON k.id = m.khoa_id
    LEFT JOIN baselines b ON k.id = b.khoa_id
    LEFT JOIN ssi_sums s ON k.id = s.khoa_id
    WHERE k.is_active = true
      AND (p_khoa_id IS NULL OR k.id = p_khoa_id);
END;
$$;

-- 10. PostgreSQL RPC phục vụ SSI Rates by Surgery với khoảng ngày (fn_nkbv_ssi_rates_by_surgery)
CREATE OR REPLACE FUNCTION public.fn_nkbv_ssi_rates_by_surgery(
    p_tu_ngay date,
    p_den_ngay date
)
RETURNS TABLE (
    loai_phau_thuat_nhsn text,
    total_surgeries bigint,
    obs_ssi_cases bigint,
    expected_ssi_cases numeric,
    ssi_raw_rate numeric,
    ssi_sir numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    WITH ssi_cases AS (
        SELECT 
            (c.verification_data->>'loai_phau_thuat_nhsn')::text AS loai_pt_nhsn,
            COUNT(c.id) AS obs_ssi
        FROM public.fact_giam_sat_nkbv_ca c
        WHERE c.is_active = true 
          AND c.vi_tri_nhiem_khuan = 'SSI'
          AND c.ngay_phat_hien >= p_tu_ngay 
          AND c.ngay_phat_hien <= p_den_ngay
          AND c.trang_thai_id IN (SELECT id FROM public.dm_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA' AND code = 'XAC_NHAN')
        GROUP BY (c.verification_data->>'loai_phau_thuat_nhsn')
    ),
    surgeries AS (
        SELECT 
            s.loai_phau_thuat_nhsn::text AS loai_pt_nhsn,
            COUNT(s.id) AS total_surg,
            SUM(s.expected_ssi_prob) AS expected_ssi
        FROM public.fact_nkbv_mau_so_phau_thuat s
        WHERE s.is_active = true
          AND s.ngay_phau_thuat >= p_tu_ngay 
          AND s.ngay_phau_thuat <= p_den_ngay
        GROUP BY s.loai_phau_thuat_nhsn
    )
    SELECT 
        COALESCE(s.loai_pt_nhsn, c.loai_pt_nhsn) AS loai_phau_thuat_nhsn,
        COALESCE(s.total_surg, 0)::bigint AS total_surgeries,
        COALESCE(c.obs_ssi, 0)::bigint AS obs_ssi_cases,
        COALESCE(s.expected_ssi, 0)::numeric AS expected_ssi_cases,
        CASE WHEN COALESCE(s.total_surg, 0) > 0 THEN ROUND((COALESCE(c.obs_ssi, 0)::numeric / s.total_surg) * 100, 2) ELSE 0 END::numeric AS ssi_raw_rate,
        CASE WHEN COALESCE(s.expected_ssi, 0) > 0 THEN ROUND(COALESCE(c.obs_ssi, 0)::numeric / s.expected_ssi, 2) ELSE 0 END::numeric AS ssi_sir
    FROM surgeries s
    FULL OUTER JOIN ssi_cases c ON s.loai_pt_nhsn = c.loai_pt_nhsn;
END;
$$;

-- 11. Bật RLS & Tạo Policies bảo mật cấp dòng cho các bảng mới
-- 11.1 dm_nkbv_cdc_baselines
ALTER TABLE public.dm_nkbv_cdc_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY dm_nkbv_cdc_baselines_select ON public.dm_nkbv_cdc_baselines FOR SELECT TO authenticated USING (true);
CREATE POLICY dm_nkbv_cdc_baselines_insert ON public.dm_nkbv_cdc_baselines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY dm_nkbv_cdc_baselines_update ON public.dm_nkbv_cdc_baselines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY dm_nkbv_cdc_baselines_delete ON public.dm_nkbv_cdc_baselines FOR DELETE TO authenticated USING (true);

-- 11.2 fact_vi_sinh_records
ALTER TABLE public.fact_vi_sinh_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_vi_sinh_records_select ON public.fact_vi_sinh_records FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_vi_sinh_records_insert ON public.fact_vi_sinh_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_vi_sinh_records_update ON public.fact_vi_sinh_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_vi_sinh_records_delete ON public.fact_vi_sinh_records FOR DELETE TO authenticated USING (true);

-- 11.3 fact_nkbv_mau_so_daily
ALTER TABLE public.fact_nkbv_mau_so_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_nkbv_mau_so_daily_select ON public.fact_nkbv_mau_so_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_nkbv_mau_so_daily_insert ON public.fact_nkbv_mau_so_daily FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_nkbv_mau_so_daily_update ON public.fact_nkbv_mau_so_daily FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_nkbv_mau_so_daily_delete ON public.fact_nkbv_mau_so_daily FOR DELETE TO authenticated USING (true);

-- 11.4 fact_nkbv_mau_so_phau_thuat
ALTER TABLE public.fact_nkbv_mau_so_phau_thuat ENABLE ROW LEVEL SECURITY;
CREATE POLICY fact_nkbv_mau_so_phau_thuat_select ON public.fact_nkbv_mau_so_phau_thuat FOR SELECT TO authenticated USING (true);
CREATE POLICY fact_nkbv_mau_so_phau_thuat_insert ON public.fact_nkbv_mau_so_phau_thuat FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY fact_nkbv_mau_so_phau_thuat_update ON public.fact_nkbv_mau_so_phau_thuat FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY fact_nkbv_mau_so_phau_thuat_delete ON public.fact_nkbv_mau_so_phau_thuat FOR DELETE TO authenticated USING (true);
