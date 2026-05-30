-- migration 20260525000010_standardize_all_remaining_tables.sql
BEGIN;

-- 1. DROP VIEW TÀN DƯ & DỌN DẸP CỘT THỪA VI_TRI_KHO
DROP VIEW IF EXISTS public.dm_vi_tri_kho CASCADE;
DELETE FROM public.dm_lookup_value WHERE category_type = 'VI_TRI_KHO';
ALTER TABLE public.cssd_fact_quy_trinh DROP COLUMN IF EXISTS vi_tri_kho_id CASCADE;

-- 2. DROP CÁC VIEWS LIÊN QUAN TRƯỚC KHI RENAME BẢNG (TRÁNH LỖI CASCADE)
DROP VIEW IF EXISTS public.v_dm_khoa_phong_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_thiet_bi_full CASCADE;
DROP VIEW IF EXISTS public.v_auth_user_permissions CASCADE;
DROP VIEW IF EXISTS public.v_dm_tieu_chi_bang_kiem_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;
DROP VIEW IF EXISTS public.v_gsc_dashboard_rows CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_quy_trinh_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_loai_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_full CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_chi_tiet_full CASCADE;
DROP VIEW IF EXISTS public.v_cssd_bo_dung_cu_chi_tiet_realtime CASCADE;
DROP VIEW IF EXISTS public.v_dm_bo_dung_cu_summary CASCADE;
DROP VIEW IF EXISTS public.v_fact_lo_tiet_khuan_full CASCADE;

-- 3. RENAME CÁC BẢNG TIẾT KIỆM HẠ TẦNG & PHÂN QUYỀN (auth_, sys_)
ALTER TABLE IF EXISTS public.dm_roles RENAME TO auth_dm_roles;
ALTER TABLE IF EXISTS public.dm_permissions RENAME TO auth_dm_permissions;
ALTER TABLE IF EXISTS public.rel_user_roles RENAME TO auth_rel_user_roles;
ALTER TABLE IF EXISTS public.rel_role_permissions RENAME TO auth_rel_role_permissions;
ALTER TABLE IF EXISTS public.fact_bv103_audit_log RENAME TO sys_fact_audit_log;
ALTER TABLE IF EXISTS public.mdm_field_registry RENAME TO sys_mdm_registry;
ALTER TABLE IF EXISTS public.mdm_governance_suggestion RENAME TO sys_mdm_suggestion;

-- 4. RENAME CÁC BẢNG MASTER DATA DÙNG CHUNG TOÀN VIỆN (mdm_)
ALTER TABLE IF EXISTS public.dm_khoa_phong RENAME TO mdm_dm_khoa_phong;
ALTER TABLE IF EXISTS public.dm_khoi_khoa RENAME TO mdm_dm_khoi_khoa;
ALTER TABLE IF EXISTS public.dm_to_cong_tac RENAME TO mdm_dm_to_cong_tac;
ALTER TABLE IF EXISTS public.dm_chuc_danh RENAME TO mdm_dm_chuc_danh;
ALTER TABLE IF EXISTS public.dm_chuc_vu RENAME TO mdm_dm_chuc_vu;
ALTER TABLE IF EXISTS public.dm_nghe_nghiep RENAME TO mdm_dm_nghe_nghiep;

-- 5. RENAME CÁC BẢNG ĐẶC THÙ CSSD CÒN LẠI (cssd_)
ALTER TABLE IF EXISTS public.dm_thiet_bi RENAME TO cssd_dm_thiet_bi;
ALTER TABLE IF EXISTS public.dm_loai_may_tiet_khuan RENAME TO cssd_dm_loai_may;
ALTER TABLE IF EXISTS public.dm_tram_cssd RENAME TO cssd_dm_tram;
ALTER TABLE IF EXISTS public.fact_bao_tri_thiet_bi RENAME TO cssd_fact_bao_tri;
ALTER TABLE IF EXISTS public.dm_hoa_chat RENAME TO cssd_dm_hoa_chat;


-- =========================================================================
-- 6. TẠO CÁC VIEWS TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY TIER)
-- =========================================================================
CREATE OR REPLACE VIEW public.dm_roles WITH (security_invoker='true') AS SELECT * FROM public.auth_dm_roles;
CREATE OR REPLACE VIEW public.dm_permissions WITH (security_invoker='true') AS SELECT * FROM public.auth_dm_permissions;
CREATE OR REPLACE VIEW public.rel_user_roles WITH (security_invoker='true') AS SELECT * FROM public.auth_rel_user_roles;
CREATE OR REPLACE VIEW public.rel_role_permissions WITH (security_invoker='true') AS SELECT * FROM public.auth_rel_role_permissions;
CREATE OR REPLACE VIEW public.fact_bv103_audit_log WITH (security_invoker='true') AS SELECT * FROM public.sys_fact_audit_log;
CREATE OR REPLACE VIEW public.mdm_field_registry WITH (security_invoker='true') AS SELECT * FROM public.sys_mdm_registry;
CREATE OR REPLACE VIEW public.mdm_governance_suggestion WITH (security_invoker='true') AS SELECT * FROM public.sys_mdm_suggestion;

CREATE OR REPLACE VIEW public.dm_khoa_phong WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_khoa_phong;
CREATE OR REPLACE VIEW public.dm_khoi_khoa WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_khoi_khoa;
CREATE OR REPLACE VIEW public.dm_to_cong_tac WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_to_cong_tac;
CREATE OR REPLACE VIEW public.dm_chuc_danh WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_chuc_danh;
CREATE OR REPLACE VIEW public.dm_chuc_vu WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_chuc_vu;
CREATE OR REPLACE VIEW public.dm_nghe_nghiep WITH (security_invoker='true') AS SELECT * FROM public.mdm_dm_nghe_nghiep;

CREATE OR REPLACE VIEW public.dm_thiet_bi WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_thiet_bi;
CREATE OR REPLACE VIEW public.dm_loai_may_tiet_khuan WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_loai_may;
CREATE OR REPLACE VIEW public.dm_tram_cssd WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_tram;
CREATE OR REPLACE VIEW public.fact_bao_tri_thiet_bi WITH (security_invoker='true') AS SELECT * FROM public.cssd_fact_bao_tri;
CREATE OR REPLACE VIEW public.dm_hoa_chat WITH (security_invoker='true') AS SELECT * FROM public.cssd_dm_hoa_chat;


-- =========================================================================
-- 7. TÁI TẠO CÁC VIEWS HỆ THỐNG & NGHIỆP VỤ BẰNG BẢNG MỚI
-- =========================================================================

CREATE OR REPLACE VIEW public.v_dm_khoa_phong_full WITH (security_invoker='true') AS
 SELECT kp.id, kp.ma_khoa, kp.ten_khoa, kp.khoi_id, kk.ma_khoi, kk.ten_khoi, kp.specs->>'mo_ta_chuc_nang' AS mo_ta_chuc_nang, (kp.specs->>'so_bac_si')::integer AS so_bac_si, (kp.specs->>'so_dieu_duong')::integer AS so_dieu_duong, (kp.specs->>'so_giuong_benh_thuong')::integer AS so_giuong_benh_thuong, (kp.specs->>'so_giuong_cap_cuu')::integer AS so_giuong_cap_cuu, kp.is_active, kp.created_at, kp.updated_at, kp.specs
 FROM public.mdm_dm_khoa_phong kp
 LEFT JOIN public.mdm_dm_khoi_khoa kk ON kk.id = kp.khoi_id;

CREATE OR REPLACE VIEW public.v_dm_thiet_bi_full WITH (security_invoker='true') AS
 SELECT tb.id, tb.ma_thiet_bi, tb.ten_thiet_bi, tb.loai_may_id, lm.ma_loai_may, lm.ten_loai_may AS ten_loai_may_hien_thi, lm.ma_loai_may AS loai_thiet_bi, tb.trang_thai, tb.specs->>'hang_san_xuat' AS hang_san_xuat, (tb.specs->>'nam_san_xuat')::integer AS nam_san_xuat, tb.ngay_dua_vao_su_dung, tb.chu_ky_bao_tri_ngay, tb.ngay_bao_tri_gan_nhat, tb.ngay_bao_tri_tiep_theo, tb.specs->>'ghi_chu' AS ghi_chu, tb.specs, tb.is_active, tb.created_at, tb.updated_at
 FROM public.cssd_dm_thiet_bi tb
 LEFT JOIN public.cssd_dm_loai_may lm ON lm.id = tb.loai_may_id;

CREATE OR REPLACE VIEW public.v_auth_user_permissions AS
 WITH user_perms AS (
         SELECT ur.user_id,
            jsonb_agg(DISTINCT r.name) AS roles,
            jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
           FROM (((public.auth_rel_user_roles ur
             JOIN public.auth_dm_roles r ON ur.role_id = r.id)
             LEFT JOIN public.auth_rel_role_permissions rp ON r.id = rp.role_id)
             LEFT JOIN public.auth_dm_permissions p ON rp.permission_id = p.id)
          GROUP BY ur.user_id
        )
 SELECT ns.id AS staff_id, ns.auth_user_id, ns.ho_ten, ns.ma_nv, ns.extra_data->>'email' AS email, ns.khoa_id, ns.is_active, k.ten_khoa AS ten_khoa_phong, k.ma_khoa AS ma_khoa_phong, COALESCE(up.roles, '[]'::jsonb) AS roles, COALESCE(up.permissions, '[]'::jsonb) AS permissions
 FROM public.mdm_nhan_su ns
 LEFT JOIN public.mdm_dm_khoa_phong k ON ns.khoa_id = k.id
 LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id;

CREATE OR REPLACE VIEW public.v_dm_tieu_chi_bang_kiem_full WITH (security_invoker='true') AS
 SELECT tc.id, tc.bang_kiem_id, bk.ma_bk AS ma_bang_kiem, bk.ten_bang_kiem, tc.noi_dung, tc.stt, tc.diem_toi_da, tc.is_active, tc.created_at, tc.updated_at
 FROM public.gstt_dm_tieu_chi_bang_kiem tc
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = tc.bang_kiem_id;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT s.id, s.bang_kiem_id, bk.ma_bk AS loai_bang_kiem, s.khoa_id, s.khu_vuc_id, s.vi_tri, s.hinh_thuc_id, s.cach_thuc_id, s.nguoi_giam_sat_id, s.is_giam_sat_ca_nhan, s.nhan_vien_id, s.nghe_nghiep_id, s.ngay_giam_sat, s.thoi_gian_ghi_nhan, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.tong_diem, s.ghi_chu_chung, COALESCE((s.metadata->>'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien, s.metadata->>'ten_manual_nhan_vien' AS ten_manual_nhan_vien, COALESCE((s.metadata->>'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh, s.metadata->>'ma_nguoi_benh' AS ma_nguoi_benh, s.metadata->>'ten_nguoi_benh' AS ten_nguoi_benh, s.metadata->>'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh, s.is_active, s.is_seen, s.created_at, s.updated_at, s.results_jsonb, k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat, ns_gs.ho_ten AS ten_nguoi_giam_sat, ns_gs.ma_nv AS ma_nguoi_giam_sat, ns_nv.ho_ten AS ten_nhan_vien, ns_nv.ma_nv AS ma_nhan_vien, nn.ma_nghe_nghiep, nn.ten_nghe_nghiep, ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat, bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
 FROM public.gstt_fact_chung_sessions s
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
 LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
 LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
 LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
 LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
 LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
 LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
 WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT o.id, o.session_id, o.nhan_vien_id, o.metadata->>'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai, o.khoa_id, o.khu_vuc_id, o.nghe_nghiep_id, o.vi_tri, o.ngay_giam_sat, o.thoi_diem, o.hanh_dong, o.dung_ky_thuat, o.du_thoi_gian, o.co_deo_gang, o.thoi_gian_ghi_nhan, o.ghi_chu, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc, COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi, nn.ma_nghe_nghiep, COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep, COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi, k.ten_khoa AS ten_khoa_phong, o.created_at
 FROM public.gstt_fact_vst o
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
 LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
 LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_sessions_full WITH (security_invoker='true') AS
 SELECT s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id, s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat, s.is_active, s.is_seen, s.created_at, s.updated_at, k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong, kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat, ns.ho_ten AS ten_nguoi_giam_sat, ns.ma_nv AS ma_nguoi_giam_sat, ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat, ( SELECT count(*) AS count FROM public.gstt_fact_vst o WHERE o.session_id = s.id) AS tong_co_hoi, ( SELECT count(*) AS count FROM public.gstt_fact_vst o WHERE o.session_id = s.id AND (lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'::text OR lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'::text)) AS da_tuan_thu
 FROM public.gstt_fact_vst_sessions s
 LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
 LEFT JOIN public.mdm_nhan_su ns ON ns.id = s.nguoi_giam_sat_id
 LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
 LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
 WHERE COALESCE(s.is_active, true) = true;

CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id, s.ngay_giam_sat, s.created_at, COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem, s.tong_diem, s.khoa_id, kp.ten_khoa, (r.elem->>'criterion_id')::uuid AS id, (r.elem->>'criterion_id')::uuid AS result_id, (r.elem->>'criterion_id')::uuid AS criterion_id, r.elem->>'value' AS value, r.elem->>'value' AS result_value, r.elem->>'note' AS note
 FROM public.gstt_fact_chung_sessions s
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
 LEFT JOIN public.mdm_dm_khoa_phong kp ON kp.id = s.khoa_id
 LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON true
 WHERE s.is_active = true;

CREATE OR REPLACE VIEW public.v_fact_cong_viec_full WITH (security_invoker='true') AS
 SELECT cv.id, cv.cong_viec_cha_id, cv.tieu_de, cv.mo_ta, cv.loai_cong_viec_id, lc.ma AS loai_cong_viec, lc.ten AS ten_loai_cong_viec, cv.trang_thai_id, ts.ma AS trang_thai, ts.ten AS ten_trang_thai_hien_thi, cv.muc_do_uu_tien, cv.han_hoan_thanh, cv.phan_tram_hoan_thanh, cv.nguoi_tao_id, cv.nguoi_giao_viec_id, cv.nguoi_phu_trach_id, cv.khoa_thuc_hien_id, cv.to_cong_tac_id, cv.dinh_ky_mau_id, cv.is_active, cv.created_at, cv.updated_at, ns_tao.ho_ten AS nguoi_tao_ten, ns_phu.ho_ten AS nguoi_phu_trach_ten, ns_giao.ho_ten AS nguoi_giao_ten, k.ten_khoa AS khoa_thuc_hien_ten, t.ten_to AS to_cong_tac_ten, ((cv.han_hoan_thanh IS NOT NULL) AND (cv.han_hoan_thanh < CURRENT_DATE) AND (COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text]))) AS is_qua_han, ( SELECT (count(*))::integer AS count FROM public.qlcv_fact_cong_viec sub WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count
 FROM public.qlcv_fact_cong_viec cv
 LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
 LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
 LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
 LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
 LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
 LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
 LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_cong_viec_qua_han AS
 SELECT id, cong_viec_cha_id, tieu_de, mo_ta, loai_cong_viec_id, loai_cong_viec, ten_loai_cong_viec, trang_thai_id, trang_thai, ten_trang_thai_hien_thi, muc_do_uu_tien, han_hoan_thanh, phan_tram_hoan_thanh, nguoi_tao_id, nguoi_giao_viec_id, nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id, is_active, created_at, updated_at, nguoi_tao_ten, nguoi_phu_trach_ten, nguoi_giao_ten, khoa_thuc_hien_ten, to_cong_tac_ten, is_qua_han, cong_viec_con_count
 FROM public.v_fact_cong_viec_full
 WHERE is_qua_han = true;

CREATE OR REPLACE VIEW public.v_fact_quy_trinh_full WITH (security_invoker='true') AS
 SELECT q.id, q.ma_qr_quy_trinh, q.bo_dung_cu_id, q.tram_hien_tai_id, t.ma_tram AS ma_trang_thai_hien_tai, t.ten_tram AS ten_tram_hien_tai, q.nguoi_dang_giu_id, q.nguoi_tiep_nhan_id, q.nguoi_lam_sach_id, q.nguoi_kiem_tra_id, q.nguoi_dong_goi_id, q.nguoi_tiet_khuan_id, q.nguoi_cap_phat_id, q.thoi_gian_tiep_nhan, q.thoi_gian_lam_sach, q.thoi_gian_qc, q.thoi_gian_dong_goi, q.thoi_gian_tiet_khuan, q.thoi_gian_cap_phat, q.lo_tiet_khuan_id, q.suds_count, q.ngay_tiet_khuan, q.han_su_dung, q.tinh_trang, q.is_dong_bang, q.quy_trinh_cha_id, q.ma_vai_tro_bo, q.metadata->>'ma_ca_mo_id' AS ma_ca_mo_id, q.ngay_het_han, q.is_active, b.ten_bo, b.ma_bo, k.ten_khoa, l.ten_loai AS ten_loai_dung_cu, q.created_at, q.updated_at
 FROM cssd_fact_quy_trinh q
 LEFT JOIN cssd_dm_tram t ON t.id = q.tram_hien_tai_id
 LEFT JOIN cssd_dm_bo_dung_cu b ON q.bo_dung_cu_id = b.id
 LEFT JOIN mdm_dm_khoa_phong k ON b.khoa_su_dung_id = k.id
 LEFT JOIN cssd_dm_loai_dung_cu l ON b.loai_dung_cu_id = l.id;

CREATE OR REPLACE VIEW public.v_dm_loai_dung_cu_summary AS
 SELECT l.id, l.ma_loai, l.ten_loai, l.mo_ta, l.created_at, l.updated_at, l.is_active, l.specs->>'ma_loai_dung_cu' AS ma_loai_dung_cu, l.specs->>'ten_loai_dung_cu' AS ten_loai_dung_cu, (l.specs ->> 'hinh_dang'::text) AS hinh_dang, (l.specs ->> 'kich_thuoc'::text) AS kich_thuoc, (l.specs ->> 'cong_dung'::text) AS cong_dung, l.is_chiu_nhiet AS is_chiu_nhiet, l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan, l.phan_loai_spaulding, l.so_ngay_han_dung, l.phan_loai, l.so_luong_kho_du_phong, (COALESCE(l.so_luong_kho_du_phong, 0) + (COALESCE(sum(CASE WHEN b.is_active = true AND c.is_active = true THEN c.so_luong ELSE 0 END), 0)::bigint))::integer AS so_luong_tong, COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'ma_bo', b.ma_bo, 'ten_bo', b.ten_bo)) FILTER (WHERE b.id IS NOT NULL AND b.is_active = true AND c.is_active = true), '[]'::jsonb) AS bo_dung_cu_chua
 FROM cssd_dm_loai_dung_cu l
 LEFT JOIN cssd_dm_bo_dung_cu_chi_tiet c ON c.loai_dung_cu_id = l.id
 LEFT JOIN cssd_dm_bo_dung_cu b ON c.bo_dung_cu_id = b.id
 GROUP BY l.id;

CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full AS
 SELECT b.id, b.ma_bo, b.ten_bo, b.loai_dung_cu_id, l.ma_loai AS ma_loai_dung_cu, l.ten_loai AS ten_loai_dung_cu, b.khoa_su_dung_id, k.ma_khoa AS ma_khoa_su_dung, k.ten_khoa AS ten_khoa_su_dung, b.trang_thai, b.quy_cach, b.ghi_chu, b.ngay_kiem_ke_gan_nhat, b.is_active, b.created_at, b.updated_at
 FROM cssd_dm_bo_dung_cu b
 LEFT JOIN cssd_dm_loai_dung_cu l ON l.id = b.loai_dung_cu_id
 LEFT JOIN mdm_dm_khoa_phong k ON k.id = b.khoa_su_dung_id;

CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full AS
 SELECT c.id, c.bo_dung_cu_id, b.ma_bo, b.ten_bo, c.loai_dung_cu_id, l.ma_loai AS ma_loai_dung_cu, l.ten_loai AS ten_loai_dung_cu, c.specs->>'ma_chi_tiet' AS ma_chi_tiet, c.ten_chi_tiet, c.ten_dung_cu_le, c.so_luong, c.specs->>'ma_qr_mau' AS ma_qr_mau, (c.specs->>'co_ma_khac')::boolean AS co_ma_khac, c.specs->>'ma_khac' AS ma_khac, c.is_active, c.ghi_chu, c.created_at, c.updated_at, c.specs
 FROM cssd_dm_bo_dung_cu_chi_tiet c
 LEFT JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
 LEFT JOIN cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id;

CREATE OR REPLACE VIEW public.v_cssd_bo_dung_cu_chi_tiet_realtime AS
 SELECT c.id AS chi_tiet_id, c.bo_dung_cu_id, b.ma_bo, b.ten_bo, c.loai_dung_cu_id, l.ma_loai AS ma_loai_dung_cu, l.ten_loai AS ten_loai_dung_cu, l.is_chiu_nhiet, l.phan_loai_spaulding, l.phuong_phap_tiet_khuan_chi_dinh AS phuong_phap_tiet_khuan, c.so_luong AS so_luong_tieu_chuan, (c.so_luong + COALESCE(v.so_luong_bien_dong, 0))::integer AS so_luong_thuc_te, CASE WHEN (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong THEN true ELSE false END AS is_missing, CASE WHEN (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)) < c.so_luong THEN (c.so_luong - (c.so_luong + COALESCE(v.so_luong_bien_dong, 0)))::integer ELSE 0::integer END AS missing_count, c.is_active, c.ghi_chu
 FROM cssd_dm_bo_dung_cu_chi_tiet c
 JOIN cssd_dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
 JOIN cssd_dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id
 LEFT JOIN public.v_cssd_bo_dung_cu_bien_dong v ON v.bo_dung_cu_id = c.bo_dung_cu_id AND v.loai_dung_cu_id = c.loai_dung_cu_id;

CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_summary AS
 SELECT b.id, b.ma_bo, b.ten_bo, b.loai_dung_cu_id, b.khoa_su_dung_id, b.trang_thai, b.quy_cach, b.ghi_chu, b.ngay_kiem_ke_gan_nhat, b.is_active, b.created_at, b.updated_at, COALESCE(q_active.cnt, 0)::integer AS so_luong_bo, COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true), 0)::integer AS so_khoan, COALESCE(SUM(c.so_luong) FILTER (WHERE c.is_active = true), 0)::integer AS tong_so_luong_dung_cu, COALESCE(SUM(p.so_luong_hien_tai) FILTER (WHERE p.is_active = true), 0)::integer AS tong_phan_bo
 FROM cssd_dm_bo_dung_cu b
 LEFT JOIN (
     SELECT bo_dung_cu_id, COUNT(id) AS cnt 
     FROM cssd_fact_quy_trinh 
     WHERE is_active = true AND tinh_trang IS DISTINCT FROM 'MAT'
     GROUP BY bo_dung_cu_id
 ) q_active ON q_active.bo_dung_cu_id = b.id
 LEFT JOIN cssd_dm_bo_dung_cu_chi_tiet c ON c.bo_dung_cu_id = b.id
 LEFT JOIN cssd_dm_bo_phan_bo p ON p.bo_dung_cu_id = b.id
 GROUP BY b.id, q_active.cnt;

CREATE OR REPLACE VIEW public.v_fact_lo_tiet_khuan_full WITH (security_invoker='true') AS
 SELECT lot.id, lot.ma_lo_tiet_khuan, lot.thiet_bi_id, tb.ten_thiet_bi, lot.loai_may_id, lm.code AS ma_loai_may, lm.name AS ten_loai_tiet_khuan, CASE WHEN lot.ket_qua_test IS TRUE THEN 'HOAN_THANH'::text WHEN lot.ket_qua_test IS FALSE THEN 'QC_KHONG_DAT'::text WHEN lot.tk_mo_form_qc_at IS NOT NULL THEN 'CHO_DANH_GIA_QC'::text WHEN lot.tk_chot_nap_at IS NOT NULL THEN 'DANG_TIET_KHUAN'::text ELSE 'DANG_CHUAN_NAP'::text END AS trang_thai, lot.tk_chot_nap_at, lot.tk_mo_form_qc_at, lot.tk_qc_json, lot.ket_qua_test, lot.is_active, lot.created_at, lot.updated_at
 FROM cssd_fact_lo_tiet_khuan lot
 LEFT JOIN cssd_dm_thiet_bi tb ON tb.id = lot.thiet_bi_id
 LEFT JOIN dm_lookup_value lm ON lm.id = lot.loai_may_id AND lm.category_type = 'LOAI_MAY_TIET_KHUAN';

COMMIT;
