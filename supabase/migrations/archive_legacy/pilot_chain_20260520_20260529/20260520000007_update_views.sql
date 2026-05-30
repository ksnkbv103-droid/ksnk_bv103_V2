-- Migration: Update 12 SQL Views to use the unified dm_lookup_value table and migrate static statuses
-- Date: 20/05/2026

-- ----------------------------------------------------
-- 1. Migrate Static Status Tables
-- ----------------------------------------------------

-- Migration of dm_trang_thai_cong_viec
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, metadata, created_at, updated_at)
SELECT 
  id, 
  'TRANG_THAI_CONG_VIEC', 
  ma, 
  ten, 
  true as is_active, 
  jsonb_build_object('mau_sac', mau_sac, 'thu_tu', thu_tu),
  now(), 
  now()
FROM public.dm_trang_thai_cong_viec
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active, metadata = EXCLUDED.metadata;

-- Migration of dm_trang_thai_nkbv_ca
INSERT INTO public.dm_lookup_value (id, category_type, code, name, is_active, metadata, created_at, updated_at)
SELECT 
  id, 
  'TRANG_THAI_NKBV_CA', 
  ma_trang_thai, 
  ten_trang_thai, 
  coalesce(is_active, true), 
  jsonb_build_object('thu_tu', thu_tu),
  coalesce(created_at, now()), 
  coalesce(updated_at, now())
FROM public.dm_trang_thai_nkbv_ca
ON CONFLICT (category_type, code) DO UPDATE 
SET name = EXCLUDED.name, is_active = EXCLUDED.is_active, metadata = EXCLUDED.metadata;

-- ----------------------------------------------------
-- 2. Drop Legacy Constraints
-- ----------------------------------------------------
ALTER TABLE public.fact_cong_viec DROP CONSTRAINT IF EXISTS fk_cong_viec_trang_thai_dm;
ALTER TABLE public.fact_giam_sat_nkbv_ca DROP CONSTRAINT IF EXISTS giam_sat_nkbv_ca_trang_thai_id_fkey;

-- ----------------------------------------------------
-- 3. Drop Legacy SQL Views (using CASCADE to handle dependencies)
-- ----------------------------------------------------
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_nkbv_ca_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_su_co_full CASCADE;
DROP VIEW IF EXISTS public.v_mdm_nhan_su_full CASCADE;

-- ----------------------------------------------------
-- 4. Recreate Views pointing to dm_lookup_value
-- ----------------------------------------------------

-- v_fact_cong_viec_full
CREATE OR REPLACE VIEW public.v_fact_cong_viec_full WITH (security_invoker='true') AS
 SELECT cv.id,
    cv.cong_viec_cha_id,
    cv.tieu_de,
    cv.mo_ta,
    cv.loai_cong_viec_id,
    lc.code AS loai_cong_viec,
    lc.name AS ten_loai_cong_viec,
    cv.trang_thai_id,
    ts.code AS trang_thai,
    ts.name AS ten_trang_thai_hien_thi,
    cv.muc_do_uu_tien,
    cv.han_hoan_thanh,
    cv.phan_tram_hoan_thanh,
    cv.nguoi_tao_id,
    cv.nguoi_giao_viec_id,
    cv.nguoi_phu_trach_id,
    cv.khoa_thuc_hien_id,
    cv.to_cong_tac_id,
    cv.dinh_ky_mau_id,
    cv.is_active,
    cv.created_at,
    cv.updated_at,
    ns_tao.ho_ten AS nguoi_tao_ten,
    ns_phu.ho_ten AS nguoi_phu_trach_ten,
    ns_giao.ho_ten AS nguoi_giao_ten,
    k.ten_khoa AS khoa_thuc_hien_ten,
    t.name AS to_cong_tac_ten,
    ((cv.han_hoan_thanh IS NOT NULL) AND (cv.han_hoan_thanh < CURRENT_DATE) AND (COALESCE(ts.code, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text]))) AS is_qua_han,
    ( SELECT (count(*))::integer AS count
           FROM public.fact_cong_viec sub
          WHERE ((sub.cong_viec_cha_id = cv.id) AND (sub.is_active = true))) AS cong_viec_con_count
   FROM (((((((public.fact_cong_viec cv
     LEFT JOIN public.dm_lookup_value lc ON ((lc.id = cv.loai_cong_viec_id AND lc.category_type = 'LOAI_CONG_VIEC')))
     LEFT JOIN public.dm_lookup_value ts ON ((ts.id = cv.trang_thai_id AND ts.category_type = 'TRANG_THAI_CONG_VIEC')))
     LEFT JOIN public.mdm_nhan_su ns_tao ON ((cv.nguoi_tao_id = ns_tao.id)))
     LEFT JOIN public.mdm_nhan_su ns_phu ON ((cv.nguoi_phu_trach_id = ns_phu.id)))
     LEFT JOIN public.mdm_nhan_su ns_giao ON ((cv.nguoi_giao_viec_id = ns_giao.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((cv.khoa_thuc_hien_id = k.id)))
     LEFT JOIN public.dm_lookup_value t ON ((cv.to_cong_tac_id = t.id AND t.category_type = 'TO_CONG_TAC')));

-- v_cong_viec_qua_han
CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
 SELECT id,
    cong_viec_cha_id,
    tieu_de,
    mo_ta,
    loai_cong_viec_id,
    loai_cong_viec,
    ten_loai_cong_viec,
    trang_thai_id,
    trang_thai,
    ten_trang_thai_hien_thi,
    muc_do_uu_tien,
    han_hoan_thanh,
    phan_tram_hoan_thanh,
    nguoi_tao_id,
    nguoi_giao_viec_id,
    nguoi_phu_trach_id,
    khoa_thuc_hien_id,
    to_cong_tac_id,
    dinh_ky_mau_id,
    is_active,
    created_at,
    updated_at,
    nguoi_tao_ten,
    nguoi_phu_trach_ten,
    nguoi_giao_ten,
    khoa_thuc_hien_ten,
    to_cong_tac_ten,
    is_qua_han,
    cong_viec_con_count
   FROM public.v_fact_cong_viec_full
  WHERE (is_qua_han = true);

-- v_dm_bo_dung_cu_chi_tiet_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full WITH (security_invoker='true') AS
 SELECT c.id,
    c.bo_dung_cu_id,
    b.ma_bo,
    b.ten_bo,
    c.loai_dung_cu_id,
    l.code AS ma_loai_dung_cu,
    l.name AS ten_loai_dung_cu,
    c.ma_chi_tiet,
    c.ten_chi_tiet,
    c.ten_dung_cu_le,
    c.so_luong,
    c.ma_qr_mau,
    c.is_active,
    c.created_at,
    c.updated_at
   FROM ((public.dm_bo_dung_cu_chi_tiet c
     LEFT JOIN public.dm_bo_dung_cu b ON ((b.id = c.bo_dung_cu_id)))
     LEFT JOIN public.dm_lookup_value l ON ((l.id = c.loai_dung_cu_id AND l.category_type = 'LOAI_DUNG_CU')));

-- v_dm_bo_dung_cu_full
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full WITH (security_invoker='true') AS
 SELECT b.id,
    b.ma_bo,
    b.ten_bo,
    b.loai_dung_cu_id,
    l.code AS ma_loai_dung_cu,
    l.name AS ten_loai_dung_cu,
    b.khoa_su_dung_id,
    k.ma_khoa AS ma_khoa_su_dung,
    k.ten_khoa AS ten_khoa_su_dung,
    b.trang_thai,
    b.quy_cach,
    b.ghi_chu,
    b.ngay_kiem_ke_gan_nhat,
    b.is_active,
    b.created_at,
    b.updated_at
   FROM ((public.dm_bo_dung_cu b
     LEFT JOIN public.dm_lookup_value l ON ((l.id = b.loai_dung_cu_id AND l.category_type = 'LOAI_DUNG_CU')))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = b.khoa_su_dung_id)));

-- v_dm_thiet_bi_full
CREATE OR REPLACE VIEW public.v_dm_thiet_bi_full WITH (security_invoker='true') AS
 SELECT tb.id,
    tb.ma_thiet_bi,
    tb.ten_thiet_bi,
    tb.loai_may_id,
    lm.code AS ma_loai_may,
    lm.name AS ten_loai_may_hien_thi,
    lm.code AS loai_thiet_bi,
    tb.trang_thai,
    tb.hang_san_xuat,
    tb.nam_san_xuat,
    tb.ngay_dua_vao_su_dung,
    tb.chu_ky_bao_tri_ngay,
    tb.ngay_bao_tri_gan_nhat,
    tb.ngay_bao_tri_tiep_theo,
    tb.ghi_chu,
    tb.is_active,
    tb.created_at,
    tb.updated_at
   FROM (public.dm_thiet_bi tb
     LEFT JOIN public.dm_lookup_value lm ON ((lm.id = tb.loai_may_id AND lm.category_type = 'LOAI_MAY_TIET_KHUAN')));

-- v_fact_giam_sat_chung_sessions_full
CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.bang_kiem_id,
    bk.ma_bk AS loai_bang_kiem,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.is_giam_sat_ca_nhan,
    s.nhan_vien_id,
    s.nghe_nghiep_id,
    s.ngay_giam_sat,
    s.thoi_gian_ghi_nhan,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.tong_diem,
    s.ghi_chu_chung,
    s.is_manual_nhan_vien,
    s.ten_manual_nhan_vien,
    s.is_bo_sung_nguoi_benh,
    s.ma_nguoi_benh,
    s.ten_nguoi_benh,
    s.so_giuong_nguoi_benh,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns_gs.ho_ten AS ten_nguoi_giam_sat,
    ns_gs.ma_nv AS ma_nguoi_giam_sat,
    ns_nv.ho_ten AS ten_nhan_vien,
    ns_nv.ma_nv AS ma_nhan_vien,
    nn.code AS ma_nghe_nghiep,
    nn.name AS ten_nghe_nghiep,
    ht.code AS ma_hinh_thuc_giam_sat,
    ht.name AS ten_hinh_thuc_danh_muc,
    ht.name AS hinh_thuc_giam_sat,
    ct.code AS ma_cach_thuc_giam_sat,
    ct.name AS ten_cach_thuc_danh_muc,
    ct.name AS cach_thuc_giam_sat,
    bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
   FROM ((((((((public.fact_giam_sat_chung_sessions s
     LEFT JOIN public.dm_bang_kiem bk ON ((bk.id = s.bang_kiem_id)))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns_gs ON ((ns_gs.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.mdm_nhan_su ns_nv ON ((ns_nv.id = s.nhan_vien_id)))
     LEFT JOIN public.dm_lookup_value nn ON ((nn.id = s.nghe_nghiep_id AND nn.category_type = 'NGHE_NGHIEP')))
     LEFT JOIN public.dm_lookup_value ht ON ((ht.id = s.hinh_thuc_id AND ht.category_type = 'HINH_THUC_GIAM_SAT')))
     LEFT JOIN public.dm_lookup_value ct ON ((ct.id = s.cach_thuc_id AND ct.category_type = 'CACH_THUC_GIAM_SAT')))
  WHERE (COALESCE(s.is_active, true) = true);

-- v_fact_giam_sat_nkbv_ca_full
CREATE OR REPLACE VIEW public.v_fact_giam_sat_nkbv_ca_full WITH (security_invoker='true') AS
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
    c.tom_tat_dien_bien,
    c.bien_phap_phong_ngua,
    c.loai_nkbv_id,
    c.trang_thai_id,
    c.ly_do_loai_tru,
    c.nguoi_ghi_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    k.ma_khoa AS khoa_ma,
    k.ten_khoa AS khoa_ten,
    l.code AS loai_ma,
    l.name AS loai_ten,
    t.code AS trang_thai_ma,
    t.name AS trang_thai_ten
   FROM (((public.fact_giam_sat_nkbv_ca c
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = c.khoa_ghi_nhan_id)))
     LEFT JOIN public.dm_lookup_value l ON ((l.id = c.loai_nkbv_id AND l.category_type = 'LOAI_NKBV')))
     LEFT JOIN public.dm_lookup_value t ON ((t.id = c.trang_thai_id AND t.category_type = 'TRANG_THAI_NKBV_CA')));

-- v_fact_giam_sat_vst_full
CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id,
    o.session_id,
    o.nhan_vien_id,
    o.ten_nhan_vien_ngoai,
    o.khoa_id,
    o.khu_vuc_id,
    o.nghe_nghiep_id,
    o.vi_tri,
    o.ngay_giam_sat,
    o.thoi_diem,
    o.hanh_dong,
    o.dung_ky_thuat,
    o.du_thoi_gian,
    o.co_deo_gang,
    o.thoi_gian_ghi_nhan,
    o.ghi_chu,
    o.legacy_csv_row_id,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
    COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
    nn.code AS ma_nghe_nghiep,
    COALESCE(nn.name, ''::text) AS nghe_nghiep,
    COALESCE(nn.name, ''::text) AS ten_nghe_nghiep_hien_thi,
    k.ten_khoa AS ten_khoa_phong,
    o.created_at
   FROM (((public.fact_giam_sat_vst o
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = o.khu_vuc_id)))
     LEFT JOIN public.dm_lookup_value nn ON ((nn.id = o.nghe_nghiep_id AND nn.category_type = 'NGHE_NGHIEP')))
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = o.khoa_id)));

-- v_fact_giam_sat_vst_sessions_full
CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id,
    s.khoa_id,
    s.khu_vuc_id,
    s.vi_tri_cu_the,
    s.hinh_thuc_id,
    s.cach_thuc_id,
    s.nguoi_giam_sat_id,
    s.thoi_gian_bat_dau,
    s.thoi_gian_ket_thuc,
    s.ngay_giam_sat,
    s.is_active,
    s.is_seen,
    s.created_at,
    s.updated_at,
    k.ma_khoa AS ma_khoa_phong,
    k.ten_khoa AS ten_khoa_phong,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
    ns.ho_ten AS ten_nguoi_giam_sat,
    ns.ma_nv AS ma_nguoi_giam_sat,
    ht.code AS ma_hinh_thuc_giam_sat,
    ht.name AS ten_hinh_thuc_danh_muc,
    ht.name AS hinh_thuc_giam_sat,
    ct.code AS ma_cach_thuc_giam_sat,
    ct.name AS ten_cach_thuc_danh_muc,
    ct.name AS cach_thuc_giam_sat,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE (o.session_id = s.id)) AS tong_co_hoi,
    ( SELECT count(*) AS count
           FROM public.fact_giam_sat_vst o
          WHERE ((o.session_id = s.id) AND ((lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'::text) OR (lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'::text)))) AS da_tuan_thu
   FROM (((((public.fact_giam_sat_vst_sessions s
     LEFT JOIN public.dm_khoa_phong k ON ((k.id = s.khoa_id)))
     LEFT JOIN public.dm_khu_vuc_giam_sat kv ON ((kv.id = s.khu_vuc_id)))
     LEFT JOIN public.mdm_nhan_su ns ON ((ns.id = s.nguoi_giam_sat_id)))
     LEFT JOIN public.dm_lookup_value ht ON ((ht.id = s.hinh_thuc_id AND ht.category_type = 'HINH_THUC_GIAM_SAT')))
     LEFT JOIN public.dm_lookup_value ct ON ((ct.id = s.cach_thuc_id AND ct.category_type = 'CACH_THUC_GIAM_SAT')))
  WHERE (COALESCE(s.is_active, true) = true);

-- v_fact_lo_tiet_khuan_full
CREATE OR REPLACE VIEW public.v_fact_lo_tiet_khuan_full WITH (security_invoker='true') AS
 SELECT lot.id,
    lot.ma_lo_tiet_khuan,
    lot.thiet_bi_id,
    tb.ten_thiet_bi,
    lot.loai_may_id,
    lm.code AS ma_loai_may,
    lm.name AS ten_loai_tiet_khuan,
        CASE
            WHEN (lot.ket_qua_test IS TRUE) THEN 'HOAN_THANH'::text
            WHEN (lot.ket_qua_test IS FALSE) THEN 'QC_KHONG_DAT'::text
            WHEN (lot.tk_mo_form_qc_at IS NOT NULL) THEN 'CHO_DANH_GIA_QC'::text
            WHEN (lot.tk_chot_nap_at IS NOT NULL) THEN 'DANG_TIET_KHUAN'::text
            ELSE 'DANG_CHUAN_NAP'::text
        END AS trang_thai,
    lot.tk_chot_nap_at,
    lot.tk_mo_form_qc_at,
    lot.tk_qc_json,
    lot.ket_qua_test,
    lot.is_active,
    lot.created_at,
    lot.updated_at
   FROM ((public.fact_lo_tiet_khuan lot
     LEFT JOIN public.dm_thiet_bi tb ON ((tb.id = lot.thiet_bi_id)))
     LEFT JOIN public.dm_lookup_value lm ON ((lm.id = lot.loai_may_id AND lm.category_type = 'LOAI_MAY_TIET_KHUAN')));

-- v_fact_quy_trinh_full
CREATE OR REPLACE VIEW public.v_fact_quy_trinh_full WITH (security_invoker='true') AS
 SELECT q.id,
    q.ma_qr_quy_trinh,
    q.bo_dung_cu_id,
    q.tram_hien_tai_id,
    t.ma_tram AS ma_trang_thai_hien_tai,
    t.ten_tram AS ten_tram_hien_tai,
    q.nguoi_dang_giu_id,
    q.nguoi_tiep_nhan_id,
    q.nguoi_lam_sach_id,
    q.nguoi_kiem_tra_id,
    q.nguoi_dong_goi_id,
    q.nguoi_tiet_khuan_id,
    q.nguoi_cap_phat_id,
    q.thoi_gian_tiep_nhan,
    q.thoi_gian_lam_sach,
    q.thoi_gian_qc,
    q.thoi_gian_dong_goi,
    q.thoi_gian_tiet_khuan,
    q.thoi_gian_cap_phat,
    q.lo_tiet_khuan_id,
    q.suds_count,
    q.ngay_tiet_khuan,
    q.han_su_dung,
    q.tinh_trang,
    q.is_dong_bang,
    q.quy_trinh_cha_id,
    q.ma_vai_tro_bo,
    q.ma_ca_mo_id,
    q.vi_tri_kho_id,
    q.ngay_het_han,
    q.is_active,
    b.ten_bo,
    b.ma_bo,
    k.ten_khoa,
    l.name AS ten_loai_dung_cu,
    q.created_at,
    q.updated_at
   FROM ((((public.fact_quy_trinh q
     LEFT JOIN public.dm_tram_cssd t ON ((t.id = q.tram_hien_tai_id)))
     LEFT JOIN public.dm_bo_dung_cu b ON ((q.bo_dung_cu_id = b.id)))
     LEFT JOIN public.dm_khoa_phong k ON ((b.khoa_su_dung_id = k.id)))
     LEFT JOIN public.dm_lookup_value l ON ((b.loai_dung_cu_id = l.id AND l.category_type = 'LOAI_DUNG_CU')));

-- v_fact_su_co_full
CREATE OR REPLACE VIEW public.v_fact_su_co_full WITH (security_invoker='true') AS
 SELECT sc.id,
    sc.quy_trinh_id,
    sc.ma_qr_quy_trinh,
    sc.ma_tram_phat_hien,
    sc.loai_su_co_id,
    ls.name AS ten_loai_su_co,
    sc.incident_group,
    sc.incident_type_label,
    COALESCE(NULLIF(concat(sc.incident_group, ':', sc.incident_type_label), ':'::text), ls.code) AS ma_loai_su_co,
    sc.mo_ta,
    sc.is_red_alert,
    sc.ma_tram_gay_loi,
    sc.created_at
   FROM (public.fact_su_co sc
     LEFT JOIN public.dm_lookup_value ls ON ((ls.id = sc.loai_su_co_id AND ls.category_type = 'LOAI_SU_CO')));

-- v_mdm_nhan_su_full
CREATE OR REPLACE VIEW public.v_mdm_nhan_su_full WITH (security_invoker='true') AS
 SELECT ns.id,
    ns.ma_nv,
    ns.ho_ten,
    ns.khoa_id,
    ns.to_id,
    ns.nghe_nghiep_id,
    ns.chuc_vu_id,
    ns.chuc_danh_id,
    ns.vai_tro_he_thong_id,
    ns.auth_user_id,
    ns.ngay_sinh,
    ns.gioi_tinh,
    ns.so_dien_thoai,
    ns.email,
    ns.extra_data,
    ns.is_active,
    k.ten_khoa,
    t.name AS ten_to,
    nn.name AS ten_nghe_nghiep,
    cv.name AS chuc_vu,
    cd.name AS chuc_danh,
    r.name AS vai_tro_he_thong_ksnk,
    cv.name AS ten_chuc_vu,
    cd.name AS ten_chuc_danh,
    r.name AS ten_vai_tro,
    ns.created_at,
    ns.updated_at
   FROM ((((((public.mdm_nhan_su ns
     LEFT JOIN public.dm_khoa_phong k ON ((ns.khoa_id = k.id)))
     LEFT JOIN public.dm_lookup_value nn ON ((ns.nghe_nghiep_id = nn.id AND nn.category_type = 'NGHE_NGHIEP')))
     LEFT JOIN public.dm_lookup_value cd ON ((ns.chuc_danh_id = cd.id AND cd.category_type = 'CHUC_DANH')))
     LEFT JOIN public.dm_lookup_value cv ON ((ns.chuc_vu_id = cv.id AND cv.category_type = 'CHUC_VU')))
     LEFT JOIN public.dm_lookup_value t ON ((ns.to_id = t.id AND t.category_type = 'TO_CONG_TAC')))
     LEFT JOIN public.dm_roles r ON ((ns.vai_tro_he_thong_id = r.id)));

-- ----------------------------------------------------
-- 5. Establish Clean Constraints pointing to dm_lookup_value
-- ----------------------------------------------------
ALTER TABLE public.fact_cong_viec
  ADD CONSTRAINT fk_cong_viec_trang_thai_dm FOREIGN KEY (trang_thai_id) REFERENCES public.dm_lookup_value(id) ON DELETE SET NULL;

ALTER TABLE public.fact_giam_sat_nkbv_ca
  ADD CONSTRAINT giam_sat_nkbv_ca_trang_thai_id_fkey FOREIGN KEY (trang_thai_id) REFERENCES public.dm_lookup_value(id) ON UPDATE CASCADE ON DELETE RESTRICT;

COMMENT ON VIEW public.v_fact_cong_viec_full IS 'View công việc đầy đủ thông tin loại công việc, trạng thái, người tạo, người phụ trách, khoa thực hiện, tổ công tác, trạng thái quá hạn.';
COMMENT ON VIEW public.v_mdm_nhan_su_full IS 'View hồ sơ nhân sự đầy đủ thông tin nghề nghiệp, chức danh, chức vụ, tổ công tác, vai trò hệ thống.';
