-- Migration: 20260528000001_simplicity_reform_gsc.sql
-- Description: Cải tổ Simplicity Phase 2 - Dọn dẹp sạch sẽ các bảng, trigger, views, functions liên quan đến JCI/RCA cồng kềnh; seed 4 phân nhóm nguy cơ vô khuẩn chuẩn; dọn permissions và cập nhật views tương thích.

BEGIN;

-- =========================================================================
-- 1. DROP CÁC TRIGGERS VÀ OBJECTS RCA / JCI (CASCADE ĐỂ DỌN SẠCH TÀN DƯ)
-- =========================================================================

-- DROP Triggers trên gstt_fact_chung_sessions và gstt_fact_vst
DROP TRIGGER IF EXISTS trg_gstt_rca_from_chung_session ON public.gstt_fact_chung_sessions CASCADE;
DROP TRIGGER IF EXISTS trg_gstt_rca_from_vst_obs ON public.gstt_fact_vst CASCADE;

-- DROP Triggers & Functions RCA, Failure Reason khác
DROP FUNCTION IF EXISTS public.fn_auto_create_rca_ticket_on_session_submit() CASCADE;
DROP FUNCTION IF EXISTS public.fn_auto_create_rca_ticket_on_vst_submit() CASCADE;
DROP FUNCTION IF EXISTS public.fn_gstt_rca_create_from_chung_session() CASCADE;
DROP FUNCTION IF EXISTS public.fn_gstt_rca_create_from_vst_obs() CASCADE;
DROP FUNCTION IF EXISTS public.fn_gstt_rca_route_phong_ban(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.fn_gstt_rca_gen_ma_ticket(date, integer) CASCADE;
DROP FUNCTION IF EXISTS public.fn_gstt_rca_ticket_touch_updated_at() CASCADE;

-- DROP Tables JCI / RCA
DROP TABLE IF EXISTS public.gstt_fact_rca_ticket CASCADE;
DROP TABLE IF EXISTS public.gstt_dm_failure_reason CASCADE;

-- DROP Views Dashboard v3 JCI / RCA
DROP VIEW IF EXISTS public.v_gstt_dashboard_pareto_v3 CASCADE;
DROP VIEW IF EXISTS public.v_gstt_dashboard_rca_summary_v3 CASCADE;
DROP VIEW IF EXISTS public.v_gstt_rca_ticket_with_overdue CASCADE;
DROP VIEW IF EXISTS public.v_gstt_pareto_session_level CASCADE;
DROP VIEW IF EXISTS public.v_gstt_pareto_unnest_array CASCADE;

-- =========================================================================
-- 2. LOẠI BỎ CÁC CỘT THỪA LIÊN QUAN ĐẾN RCA TRÊN BẢNG CHÍNH
-- =========================================================================

-- Dọn cột trên gstt_fact_chung_sessions. Giữ lại du_lieu_nghi_van (Anti-Hawthorne).
ALTER TABLE public.gstt_fact_chung_sessions
  DROP COLUMN IF EXISTS nguyen_nhan_loi_ids CASCADE,
  DROP COLUMN IF EXISTS ghi_chu_phan_tich CASCADE,
  DROP COLUMN IF EXISTS muc_do_canh_bao_cao_nhat CASCADE;

-- Dọn cột trên gstt_fact_vst. Giữ lại da_can_thiep_ngay và url_anh_bang_chung (Evidences).
ALTER TABLE public.gstt_fact_vst
  DROP COLUMN IF EXISTS nguyen_nhan_loi_id CASCADE;

-- =========================================================================
-- 3. DỌN DẸP PERMISSIONS & RBAC TRONG DATABASE
-- =========================================================================
DELETE FROM public.sys_role_permissions 
WHERE permission_id IN (
  SELECT id FROM public.sys_permissions 
  WHERE module_name IN ('RCA_TICKET', 'MDM_FAILURE_REASON')
);

DELETE FROM public.sys_permissions 
WHERE module_name IN ('RCA_TICKET', 'MDM_FAILURE_REASON');

-- =========================================================================
-- 4. ĐỒNG BỘ 4 VÙNG NGUY CƠ VÔ KHUẨN CHUẨN TRONG SYS_LOOKUP_VALUE
-- =========================================================================

-- Seed 4 vùng nguy cơ lây nhiễm IPAC chuẩn
INSERT INTO public.sys_lookup_value (id, category_type, code, name, is_active, metadata)
VALUES
  (gen_random_uuid(), 'KHU_VUC_GIAM_SAT', 'TRANG', 'Nhóm yêu cầu Vô khuẩn cao (Trắng)', true, '{}'::jsonb),
  (gen_random_uuid(), 'KHU_VUC_GIAM_SAT', 'DO', 'Nhóm Nguy cơ lây nhiễm cao (Đỏ)', true, '{}'::jsonb),
  (gen_random_uuid(), 'KHU_VUC_GIAM_SAT', 'VANG', 'Nhóm Nguy cơ lây nhiễm trung bình (Vàng)', true, '{}'::jsonb),
  (gen_random_uuid(), 'KHU_VUC_GIAM_SAT', 'XANH', 'Nhóm Nguy cơ lây nhiễm thấp (Xanh)', true, '{}'::jsonb)
ON CONFLICT (category_type, code) 
DO UPDATE SET 
  name = EXCLUDED.name, 
  is_active = true,
  metadata = EXCLUDED.metadata;

-- Vô hiệu hóa toàn bộ các khu vực cũ trong lookup
UPDATE public.sys_lookup_value 
SET is_active = false 
WHERE category_type = 'KHU_VUC_GIAM_SAT' 
  AND code NOT IN ('TRANG', 'DO', 'VANG', 'XANH');

-- =========================================================================
-- 5. CẬP NHẬT CÁC VIEWS TƯƠNG THÍCH NGƯỢC (RECREATE TIER)
-- =========================================================================

-- View dm_khu_vuc_giam_sat và gstt_dm_khu_vuc_giam_sat trỏ về sys_lookup_value
DROP VIEW IF EXISTS public.dm_khu_vuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.gstt_dm_khu_vuc_giam_sat CASCADE;

CREATE OR REPLACE VIEW public.dm_khu_vuc_giam_sat WITH (security_invoker='true') AS 
  SELECT id, code AS ma_khu_vuc, name AS ten_khu_vuc, is_active, created_at, updated_at
  FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker='true') AS 
  SELECT id, code AS ma_khu_vuc, name AS ten_khu_vuc, is_active, created_at, updated_at
  FROM public.sys_lookup_value
  WHERE category_type = 'KHU_VUC_GIAM_SAT';

-- Recreate view v_fact_giam_sat_chung_sessions_full dọn sạch RCA/Failure Reason
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE OR REPLACE VIEW public.v_fact_giam_sat_chung_sessions_full WITH (security_invoker='true') AS
 SELECT 
    s.id, 
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
    COALESCE((s.metadata->>'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien, 
    s.metadata->>'ten_manual_nhan_vien' AS ten_manual_nhan_vien, 
    COALESCE((s.metadata->>'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh, 
    s.metadata->>'ma_nguoi_benh' AS ma_nguoi_benh, 
    s.metadata->>'ten_nguoi_benh' AS ten_nguoi_benh, 
    s.metadata->>'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh, 
    s.is_active, 
    s.is_seen, 
    s.created_at, 
    s.updated_at, 
    s.results_jsonb, 
    s.dat_tron_goi,
    s.du_lieu_nghi_van,
    k.ma_khoa AS ma_khoa_phong, 
    k.ten_khoa AS ten_khoa_phong, 
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, 
    kv.ten_khu_vuc AS ten_khu_vuc_giam_sat, 
    ns_gs.ho_ten AS ten_nguoi_giam_sat, 
    ns_gs.ma_nv AS ma_nguoi_giam_sat, 
    ns_nv.ho_ten AS ten_nhan_vien, 
    ns_nv.ma_nv AS ma_nhan_vien, 
    nn.ma_nghe_nghiep, 
    nn.ten_nghe_nghiep, 
    ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, 
    ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, 
    ht.ten_hinh_thuc AS hinh_thuc_giam_sat, 
    ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, 
    ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, 
    ct.ten_cach_thuc AS cach_thuc_giam_sat, 
    bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
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

-- Recreate view v_fact_giam_sat_vst_full tương thích dọn sạch FK failure reason
CREATE OR REPLACE VIEW public.v_fact_giam_sat_vst_full WITH (security_invoker='true') AS
 SELECT 
    o.id, 
    o.session_id, 
    o.nhan_vien_id, 
    o.metadata->>'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai, 
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
    o.da_can_thiep_ngay,
    o.url_anh_bang_chung,
    kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, 
    COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc, 
    COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi, 
    nn.ma_nghe_nghiep, 
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep, 
    COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi, 
    k.ten_khoa AS ten_khoa_phong, 
    o.created_at
 FROM public.gstt_fact_vst o
 LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
 LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
 LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id;

-- Recreate view v_gsc_dashboard_rows tương thích dọn sạch
CREATE OR REPLACE VIEW public.v_gsc_dashboard_rows WITH (security_invoker='true') AS
 SELECT s.id AS session_id, s.ngay_giam_sat, s.created_at, COALESCE(bk.ma_bk, ''::text) AS loai_bang_kiem, s.tong_diem, s.khoa_id, kp.ten_khoa, (r.elem->>'criterion_id')::uuid AS id, (r.elem->>'criterion_id')::uuid AS result_id, (r.elem->>'criterion_id')::uuid AS criterion_id, r.elem->>'value' AS value, r.elem->>'value' AS result_value, r.elem->>'note' AS note
 FROM public.gstt_fact_chung_sessions s
 LEFT JOIN public.gstt_dm_bang_kiem bk ON bk.id = s.bang_kiem_id
 LEFT JOIN public.mdm_dm_khoa_phong kp ON kp.id = s.khoa_id
 LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) r(elem) ON true
 WHERE s.is_active = true;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
