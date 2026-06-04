-- Module SSOT: khôi phục {module}_dm_* lookup, read view JOIN module names,
-- rewrite function/RPC bodies off fact_* / dm_* compat, DROP legacy compat views.
-- App contract: domain-registry + src .from() dùng prefix module (codemod 2026-06-02).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) GSTT read views (DROP trước khi đổi lookup layer)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_gstt_giam_sat_chung_sessions_full;
DROP VIEW IF EXISTS public.v_gstt_giam_sat_vst_full;
DROP VIEW IF EXISTS public.v_gstt_giam_sat_vst_sessions_full;

-- ---------------------------------------------------------------------------
-- 2) Module lookup façades → sys_lookup_value (thay dm_* compat)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.mdm_dm_chuc_danh WITH (security_invoker = true) AS
 SELECT id, code AS ma_chuc_danh, name AS ten_chuc_danh, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CHUC_DANH';

CREATE OR REPLACE VIEW public.mdm_dm_chuc_vu WITH (security_invoker = true) AS
 SELECT id, code AS ma_chuc_vu, name AS ten_chuc_vu, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CHUC_VU';

CREATE OR REPLACE VIEW public.mdm_dm_khoi_khoa WITH (security_invoker = true) AS
 SELECT id, code AS ma_khoi, name AS ten_khoi, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'KHOI_KHOA';

CREATE OR REPLACE VIEW public.mdm_dm_nghe_nghiep WITH (security_invoker = true) AS
 SELECT id, code AS ma_nghe_nghiep, name AS ten_nghe_nghiep, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'NGHE_NGHIEP';

CREATE OR REPLACE VIEW public.mdm_dm_to_cong_tac WITH (security_invoker = true) AS
 SELECT id, code AS ma_to, name AS ten_to, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TO_CONG_TAC';

CREATE OR REPLACE VIEW public.gstt_dm_hinh_thuc_giam_sat WITH (security_invoker = true) AS
 SELECT id, code AS ma_hinh_thuc, name AS ten_hinh_thuc, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'HINH_THUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.gstt_dm_cach_thuc_giam_sat WITH (security_invoker = true) AS
 SELECT id, code AS ma_cach_thuc, name AS ten_cach_thuc, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'CACH_THUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.gstt_dm_khu_vuc_giam_sat WITH (security_invoker = true) AS
 SELECT id, code AS ma_khu_vuc, name AS ten_khu_vuc, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'KHU_VUC_GIAM_SAT';

CREATE OR REPLACE VIEW public.qlcv_dm_loai_cong_viec WITH (security_invoker = true) AS
 SELECT id,
    code AS ma,
    name AS ten,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'LOAI_CONG_VIEC';

CREATE OR REPLACE VIEW public.qlcv_dm_trang_thai_cong_viec WITH (security_invoker = true) AS
 SELECT id,
    code AS ma,
    name AS ten,
    metadata ->> 'mau_sac' AS mau_sac,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_CONG_VIEC';

CREATE OR REPLACE VIEW public.nkbv_dm_loai WITH (security_invoker = true) AS
 SELECT id, code AS ma_loai, name AS ten_loai, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'LOAI_NKBV';

CREATE OR REPLACE VIEW public.nkbv_dm_trang_thai_ca WITH (security_invoker = true) AS
 SELECT id,
    code AS ma_trang_thai,
    name AS ten_trang_thai,
    COALESCE((metadata ->> 'thu_tu')::integer, 0) AS thu_tu,
    is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'TRANG_THAI_NKBV_CA';

CREATE OR REPLACE VIEW public.cssd_dm_loai_su_co WITH (security_invoker = true) AS
 SELECT id, code AS ma_loai_su_co, name AS ten_loai_su_co, is_active, created_at, updated_at
   FROM public.sys_lookup_value WHERE category_type = 'LOAI_SU_CO';

-- ---------------------------------------------------------------------------
-- 3) GSTT read views — JOIN module lookup (không dm_*)
-- ---------------------------------------------------------------------------
CREATE VIEW public.v_gstt_giam_sat_chung_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id, s.bang_kiem_id, bk.ma_bk AS loai_bang_kiem, bk.loai_giam_sat, bk.cach_tinh_diem,
  s.khoa_id, s.khu_vuc_id, s.vi_tri, s.hinh_thuc_id, s.cach_thuc_id,
  s.nguoi_giam_sat_id, s.is_giam_sat_ca_nhan, s.nhan_vien_id, s.nghe_nghiep_id,
  s.ngay_giam_sat, s.thoi_gian_ghi_nhan, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc,
  s.tong_diem, s.ghi_chu_chung,
  COALESCE((s.metadata ->> 'is_manual_nhan_vien')::boolean, false) AS is_manual_nhan_vien,
  s.metadata ->> 'ten_manual_nhan_vien' AS ten_manual_nhan_vien,
  COALESCE((s.metadata ->> 'is_bo_sung_nguoi_benh')::boolean, false) AS is_bo_sung_nguoi_benh,
  s.metadata ->> 'ma_nguoi_benh' AS ma_nguoi_benh,
  s.metadata ->> 'ten_nguoi_benh' AS ten_nguoi_benh,
  s.metadata ->> 'so_giuong_nguoi_benh' AS so_giuong_nguoi_benh,
  s.is_active, s.is_seen, s.created_at, s.updated_at, s.results_jsonb,
  s.dat_tron_goi, s.du_lieu_nghi_van,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat, kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat, ns_gs.ma_nv AS ma_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien, ns_nv.ma_nv AS ma_nhan_vien,
  nn.ma_nghe_nghiep, nn.ten_nghe_nghiep,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ht.ten_hinh_thuc AS hinh_thuc_giam_sat,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc, ct.ten_cach_thuc AS cach_thuc_giam_sat,
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

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_full WITH (security_invoker = true) AS
SELECT
  o.id, o.session_id, o.nhan_vien_id,
  o.metadata ->> 'ten_nhan_vien_ngoai' AS ten_nhan_vien_ngoai,
  COALESCE(ns.ho_ten, o.metadata ->> 'ten_nhan_vien_ngoai') AS ten_nhan_vien,
  o.khoa_id, o.khu_vuc_id, o.nghe_nghiep_id, o.vi_tri, o.ngay_giam_sat,
  o.thoi_diem, o.hanh_dong, o.dung_ky_thuat, o.du_thoi_gian, o.co_deo_gang,
  o.thoi_gian_ghi_nhan, o.ghi_chu,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  COALESCE(kv.ten_khu_vuc, ''::text) AS khu_vuc,
  COALESCE(kv.ten_khu_vuc, ''::text) AS ten_khu_vuc_hien_thi,
  nn.ma_nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS nghe_nghiep,
  COALESCE(nn.ten_nghe_nghiep, ''::text) AS ten_nghe_nghiep_hien_thi,
  k.ten_khoa AS ten_khoa_phong,
  o.metadata ->> 'legacy_csv_row_id' AS legacy_csv_row_id,
  o.created_at
FROM public.gstt_fact_vst o
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.mdm_dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = o.khoa_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = o.nhan_vien_id;

CREATE OR REPLACE VIEW public.v_gstt_giam_sat_vst_sessions_full WITH (security_invoker = true) AS
SELECT
  s.id, s.khoa_id, s.khu_vuc_id, s.vi_tri_cu_the, s.hinh_thuc_id, s.cach_thuc_id,
  ht.ten_hinh_thuc AS hinh_thuc_giam_sat, ct.ten_cach_thuc AS cach_thuc_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat, ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  ht.ten_hinh_thuc AS ten_hinh_thuc_danh_muc, ct.ten_cach_thuc AS ten_cach_thuc_danh_muc,
  s.nguoi_giam_sat_id, s.thoi_gian_bat_dau, s.thoi_gian_ket_thuc, s.ngay_giam_sat,
  s.created_at, s.updated_at, s.is_active, s.is_seen,
  k.ma_khoa AS ma_khoa_phong, k.ten_khoa AS ten_khoa_phong,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  COALESCE(agg.tong_co_hoi, 0::bigint) AS tong_co_hoi,
  COALESCE(agg.da_tuan_thu, 0::bigint) AS da_tuan_thu
FROM public.gstt_fact_vst_sessions s
LEFT JOIN public.mdm_dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.gstt_dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.gstt_dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.gstt_dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN (
  SELECT session_id, sum(so_co_hoi) AS tong_co_hoi, sum(da_tuan_thu) AS da_tuan_thu
  FROM public.gstt_fact_vst_opportunities_summary
  GROUP BY session_id
) agg ON agg.session_id = s.id
WHERE COALESCE(s.is_active, true) = true;

GRANT SELECT ON public.v_gstt_giam_sat_chung_sessions_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_vst_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_gstt_giam_sat_vst_sessions_full TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) QLCV read view — mdm_dm_to_cong_tac
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id, cv.cong_viec_cha_id, cv.tieu_de, cv.mo_ta, cv.loai_cong_viec_id,
  lc.ma AS loai_cong_viec, lc.ten AS ten_loai_cong_viec, cv.trang_thai_id,
  ts.ma AS trang_thai, ts.ten AS ten_trang_thai_hien_thi, cv.muc_do_uu_tien,
  cv.han_hoan_thanh, cv.phan_tram_hoan_thanh, cv.nguoi_tao_id, cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id, cv.khoa_thuc_hien_id, cv.to_cong_tac_id, cv.dinh_ky_mau_id,
  cv.is_active, cv.created_at, cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten, ns_phu.ho_ten AS nguoi_phu_trach_ten, ns_giao.ho_ten AS nguoi_giao_ten,
  k.ten_khoa AS khoa_thuc_hien_ten, t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  (SELECT count(*)::integer FROM public.qlcv_fact_cong_viec sub
   WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count,
  cv.checklist
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

-- ---------------------------------------------------------------------------
-- 5) Core functions (sync, lock, QLCV) — module table names
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_single_gsc_session(p_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
  DELETE FROM public.gstt_fact_gsc_dashboard_summary WHERE session_id = p_session_id;
  DELETE FROM public.gstt_fact_gsc_violations_summary WHERE session_id = p_session_id;

  IF EXISTS (SELECT 1 FROM public.gstt_fact_chung_sessions WHERE id = p_session_id AND is_active = true) THEN
    INSERT INTO public.gstt_fact_gsc_dashboard_summary (
      session_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_phien, tong_quan_sat, tong_dat, tong_vi_pham
    )
    SELECT
      s.id, s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id, 1,
      COUNT(r.elem),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'DAT'),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.gstt_fact_chung_sessions s
    LEFT JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id
    GROUP BY s.id;

    INSERT INTO public.gstt_fact_gsc_violations_summary (
      session_id, criterion_id, ngay_giam_sat, bang_kiem_id, khoa_id, khu_vuc_id, nghe_nghiep_id, stype, nguoi_giam_sat_id,
      tong_quan_sat, tong_vi_pham
    )
    SELECT
      s.id, (r.elem ->> 'criterion_id')::uuid AS criterion_id,
      s.ngay_giam_sat, s.bang_kiem_id, s.khoa_id, s.khu_vuc_id, s.nghe_nghiep_id,
      public.fn_get_session_stype(s.nguoi_giam_sat_id, s.khoa_id) AS stype,
      s.nguoi_giam_sat_id,
      COUNT(r.elem),
      COUNT(r.elem) FILTER (WHERE r.elem ->> 'value' = 'KHONG_DAT')
    FROM public.gstt_fact_chung_sessions s
    INNER JOIN LATERAL jsonb_array_elements(s.results_jsonb) AS r(elem) ON true
    WHERE s.id = p_session_id AND r.elem ->> 'criterion_id' IS NOT NULL
    GROUP BY s.id, (r.elem ->> 'criterion_id');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_assert_vst_gsc_not_locked()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_lock_date date;
  v_record_date date;
  v_module text;
BEGIN
  IF TG_TABLE_NAME = 'gstt_fact_vst_sessions' THEN
    v_module := 'VST';
  ELSIF TG_TABLE_NAME = 'gstt_fact_chung_sessions' THEN
    v_module := 'GSC';
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  SELECT locked_until_date INTO v_lock_date
  FROM public.sys_module_locks
  WHERE module_name = v_module
  LIMIT 1;

  IF v_lock_date IS NOT NULL THEN
    v_record_date := OLD.ngay_giam_sat;
    IF v_record_date IS NOT NULL AND v_record_date <= v_lock_date THEN
      RAISE EXCEPTION 'Dữ liệu giám sát % ngày % đã bị khóa cứng để chốt báo cáo thi đua. Không cho phép sửa đổi hoặc xóa!', v_module, v_record_date;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_moi_id uuid;
  anchor_months int;
  due_months int;
BEGIN
  SELECT id INTO v_loai_id FROM public.qlcv_dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;
  SELECT id INTO v_tt_moi_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = 'MOI' LIMIT 1;

  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
    match_due := false;
    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN match_due := true;
      WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      ELSE CONTINUE;
    END CASE;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_moi_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true, public.fn_qlcv_mo_ta_to_checklist(r.mo_ta)
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_qlcv_update_checklist(
  p_cong_viec_id uuid,
  p_checklist jsonb,
  p_phan_tram_hoan_thanh integer DEFAULT NULL,
  p_trang_thai_ma text DEFAULT NULL
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_tt_id uuid;
  v_pct integer;
BEGIN
  IF p_cong_viec_id IS NULL THEN RAISE EXCEPTION 'p_cong_viec_id bắt buộc'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.qlcv_fact_cong_viec WHERE id = p_cong_viec_id) THEN
    RAISE EXCEPTION 'Không tìm thấy công việc %', p_cong_viec_id;
  END IF;
  v_pct := COALESCE(p_phan_tram_hoan_thanh, 0);
  IF p_trang_thai_ma IS NOT NULL AND btrim(p_trang_thai_ma) <> '' THEN
    SELECT id INTO v_tt_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = p_trang_thai_ma LIMIT 1;
    IF v_tt_id IS NULL THEN RAISE EXCEPTION 'Trạng thái không hợp lệ: %', p_trang_thai_ma; END IF;
  END IF;
  UPDATE public.qlcv_fact_cong_viec
     SET checklist = COALESCE(p_checklist, '[]'::jsonb),
         phan_tram_hoan_thanh = v_pct,
         trang_thai_id = COALESCE(v_tt_id, trang_thai_id),
         updated_at = now()
   WHERE id = p_cong_viec_id;
  RETURN jsonb_build_object('id', p_cong_viec_id, 'phan_tram_hoan_thanh', v_pct, 'checklist', COALESCE(p_checklist, '[]'::jsonb));
END;
$function$;

-- Compat alias (đã DROP ở 20260530100000) — một số RPC trên remote vẫn tham chiếu khi EXECUTE rewrite.
CREATE OR REPLACE VIEW public.v_auth_user_permissions WITH (security_invoker = true) AS
SELECT
  staff_id,
  auth_user_id,
  ho_ten,
  ma_nv,
  email,
  khoa_id,
  is_active,
  ten_khoa_phong,
  ma_khoa_phong,
  roles,
  permissions
FROM public.v_sys_user_permissions;

GRANT SELECT ON public.v_auth_user_permissions TO anon, authenticated, service_role;

-- Rewrite remaining RPC/dashboard functions still pointing at compat views
DO $do$
DECLARE
  func record;
  olddef text;
  newdef text;
BEGIN
  FOR func IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ~ 'public\.(fact_|dm_)'
  LOOP
    olddef := pg_get_functiondef(func.oid);
    newdef := olddef;
    -- compat read views (trước dm_* để tránh replace nhầm token trong tên view)
    newdef := replace(newdef, 'public.v_auth_user_permissions', 'public.v_sys_user_permissions');
    -- fact_* (longest token first)
    newdef := replace(newdef, 'public.fact_giam_sat_chung_sessions', 'public.gstt_fact_chung_sessions');
    newdef := replace(newdef, 'public.fact_giam_sat_vst_sessions', 'public.gstt_fact_vst_sessions');
    newdef := replace(newdef, 'public.fact_giam_sat_vst', 'public.gstt_fact_vst');
    newdef := replace(newdef, 'public.fact_gsc_dashboard_summary', 'public.gstt_fact_gsc_dashboard_summary');
    newdef := replace(newdef, 'public.fact_gsc_violations_summary', 'public.gstt_fact_gsc_violations_summary');
    newdef := replace(newdef, 'public.fact_vst_sessions_summary', 'public.gstt_fact_vst_sessions_summary');
    newdef := replace(newdef, 'public.fact_vst_opportunities_summary', 'public.gstt_fact_vst_opportunities_summary');
    newdef := replace(newdef, 'public.fact_vst_moments_summary', 'public.gstt_fact_vst_moments_summary');
    newdef := replace(newdef, 'public.fact_cong_viec_dinh_ky', 'public.qlcv_fact_cong_viec_dinh_ky');
    newdef := replace(newdef, 'public.fact_cong_viec_hoat_dong', 'public.qlcv_fact_cong_viec_hoat_dong');
    newdef := replace(newdef, 'public.fact_cong_viec', 'public.qlcv_fact_cong_viec');
    newdef := replace(newdef, 'public.fact_nkbv_mau_so_phau_thuat', 'public.nkbv_fact_mau_so_phau_thuat');
    newdef := replace(newdef, 'public.fact_nkbv_mau_so_daily', 'public.nkbv_fact_mau_so_daily');
    newdef := replace(newdef, 'public.fact_nkbv_vi_sinh', 'public.nkbv_fact_vi_sinh');
    newdef := replace(newdef, 'public.fact_nkbv_su_kien', 'public.nkbv_fact_su_kien');
    newdef := replace(newdef, 'public.fact_nkbv_benh_an', 'public.nkbv_fact_benh_an');
    newdef := replace(newdef, 'public.fact_kho_dung_cu_giao_dich', 'public.cssd_fact_kho_giao_dich');
    newdef := replace(newdef, 'public.fact_bv103_audit_log', 'public.sys_audit_log');
    -- dm_* lookup
    newdef := replace(newdef, 'public.dm_trang_thai_cong_viec', 'public.qlcv_dm_trang_thai_cong_viec');
    newdef := replace(newdef, 'public.dm_loai_cong_viec', 'public.qlcv_dm_loai_cong_viec');
    newdef := replace(newdef, 'public.dm_trang_thai_nkbv_ca', 'public.nkbv_dm_trang_thai_ca');
    newdef := replace(newdef, 'public.dm_loai_nkbv', 'public.nkbv_dm_loai');
    newdef := replace(newdef, 'public.dm_hinh_thuc_giam_sat', 'public.gstt_dm_hinh_thuc_giam_sat');
    newdef := replace(newdef, 'public.dm_cach_thuc_giam_sat', 'public.gstt_dm_cach_thuc_giam_sat');
    newdef := replace(newdef, 'public.dm_khu_vuc_giam_sat', 'public.gstt_dm_khu_vuc_giam_sat');
    newdef := replace(newdef, 'public.dm_khoa_phong', 'public.mdm_dm_khoa_phong');
    newdef := replace(newdef, 'public.dm_to_cong_tac', 'public.mdm_dm_to_cong_tac');
    newdef := replace(newdef, 'public.dm_nghe_nghiep', 'public.mdm_dm_nghe_nghiep');
    newdef := replace(newdef, 'public.dm_chuc_danh', 'public.mdm_dm_chuc_danh');
    newdef := replace(newdef, 'public.dm_chuc_vu', 'public.mdm_dm_chuc_vu');
    newdef := replace(newdef, 'public.dm_khoi_khoa', 'public.mdm_dm_khoi_khoa');
    newdef := replace(newdef, 'public.dm_tram_cssd', 'public.cssd_dm_tram');
    newdef := replace(newdef, 'public.dm_loai_may_tiet_khuan', 'public.cssd_dm_loai_may');
    newdef := replace(newdef, 'public.dm_loai_su_co', 'public.cssd_dm_loai_su_co');
    newdef := replace(newdef, 'public.dm_bang_kiem', 'public.gstt_dm_bang_kiem');
    newdef := replace(newdef, 'public.dm_bo_dung_cu_chi_tiet', 'public.cssd_dm_bo_dung_cu_chi_tiet');
    newdef := replace(newdef, 'public.dm_bo_dung_cu_phan_bo', 'public.cssd_dm_bo_phan_bo');
    newdef := replace(newdef, 'public.dm_bo_dung_cu', 'public.cssd_dm_bo_dung_cu');
    newdef := replace(newdef, 'public.dm_loai_dung_cu', 'public.cssd_dm_loai_dung_cu');
    newdef := replace(newdef, 'public.dm_thiet_bi', 'public.cssd_dm_thiet_bi');
    newdef := replace(newdef, 'public.dm_hoa_chat', 'public.cssd_dm_hoa_chat');
    newdef := replace(newdef, 'public.dm_tieu_chi_bang_kiem', 'public.gstt_dm_tieu_chi_bang_kiem');
    newdef := replace(newdef, 'public.dm_nkbv_cdc_baselines', 'public.nkbv_dm_cdc_baseline');
    newdef := replace(newdef, 'public.dm_lookup_value', 'public.sys_lookup_value');
    newdef := replace(newdef, 'public.dm_permissions', 'public.sys_permissions');
    newdef := replace(newdef, 'public.dm_roles', 'public.sys_roles');
  newdef := replace(newdef, 'fn_fact_cong_viec_spawn_dinh_ky_hom_nay', 'fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay');
    IF newdef IS DISTINCT FROM olddef THEN
      BEGIN
        EXECUTE newdef;
      EXCEPTION
        WHEN undefined_table OR undefined_object THEN
          RAISE NOTICE 'skip function rewrite (missing relation): %', func.oid::text;
      END;
    END IF;
  END LOOP;
END;
$do$;

DROP VIEW IF EXISTS public.v_auth_user_permissions;

DROP FUNCTION IF EXISTS public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay();

-- pg_cron → RPC module name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv_spawn_dinh_ky_daily') THEN
      PERFORM cron.unschedule('qlcv_spawn_dinh_ky_daily');
    END IF;
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'qlcv-spawn-dinh-ky-daily') THEN
      PERFORM cron.unschedule('qlcv-spawn-dinh-ky-daily');
    END IF;
    PERFORM cron.schedule(
      'qlcv-spawn-dinh-ky-daily',
      '0 1 * * *',
      'SELECT public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay();'
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) DROP legacy compat views (dm_* / fact_*)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.dm_bang_kiem CASCADE;
DROP VIEW IF EXISTS public.dm_bo_dung_cu CASCADE;
DROP VIEW IF EXISTS public.dm_bo_dung_cu_chi_tiet CASCADE;
DROP VIEW IF EXISTS public.dm_bo_dung_cu_phan_bo CASCADE;
DROP VIEW IF EXISTS public.dm_cach_thuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.dm_chuc_danh CASCADE;
DROP VIEW IF EXISTS public.dm_chuc_vu CASCADE;
DROP VIEW IF EXISTS public.dm_hinh_thuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.dm_hoa_chat CASCADE;
DROP VIEW IF EXISTS public.dm_khoa_phong CASCADE;
DROP VIEW IF EXISTS public.dm_khoi_khoa CASCADE;
DROP VIEW IF EXISTS public.dm_khu_vuc_giam_sat CASCADE;
DROP VIEW IF EXISTS public.dm_loai_cong_viec CASCADE;
DROP VIEW IF EXISTS public.dm_loai_dung_cu CASCADE;
DROP VIEW IF EXISTS public.dm_loai_may_tiet_khuan CASCADE;
DROP VIEW IF EXISTS public.dm_loai_nkbv CASCADE;
DROP VIEW IF EXISTS public.dm_loai_su_co CASCADE;
DROP VIEW IF EXISTS public.dm_lookup_value CASCADE;
DROP VIEW IF EXISTS public.dm_nghe_nghiep CASCADE;
DROP VIEW IF EXISTS public.dm_nkbv_cdc_baselines CASCADE;
DROP VIEW IF EXISTS public.dm_permissions CASCADE;
DROP VIEW IF EXISTS public.dm_roles CASCADE;
DROP VIEW IF EXISTS public.dm_thiet_bi CASCADE;
DROP VIEW IF EXISTS public.dm_tieu_chi_bang_kiem CASCADE;
DROP VIEW IF EXISTS public.dm_to_cong_tac CASCADE;
DROP VIEW IF EXISTS public.dm_tram_cssd CASCADE;
DROP VIEW IF EXISTS public.dm_trang_thai_cong_viec CASCADE;
DROP VIEW IF EXISTS public.dm_trang_thai_nkbv_ca CASCADE;

DROP VIEW IF EXISTS public.fact_bv103_audit_log;
DROP VIEW IF EXISTS public.fact_cong_viec;
DROP VIEW IF EXISTS public.fact_cong_viec_dinh_ky;
DROP VIEW IF EXISTS public.fact_cong_viec_hoat_dong;
DROP VIEW IF EXISTS public.fact_giam_sat_chung_sessions;
DROP VIEW IF EXISTS public.fact_giam_sat_vst;
DROP VIEW IF EXISTS public.fact_giam_sat_vst_sessions;
DROP VIEW IF EXISTS public.fact_gsc_dashboard_summary;
DROP VIEW IF EXISTS public.fact_gsc_violations_summary;
DROP VIEW IF EXISTS public.fact_kho_dung_cu_giao_dich;
DROP VIEW IF EXISTS public.fact_nkbv_benh_an;
DROP VIEW IF EXISTS public.fact_nkbv_mau_so_daily;
DROP VIEW IF EXISTS public.fact_nkbv_mau_so_phau_thuat;
DROP VIEW IF EXISTS public.fact_nkbv_su_kien;
DROP VIEW IF EXISTS public.fact_nkbv_vi_sinh;
DROP VIEW IF EXISTS public.fact_vst_moments_summary;
DROP VIEW IF EXISTS public.fact_vst_opportunities_summary;
DROP VIEW IF EXISTS public.fact_vst_sessions_summary;

NOTIFY pgrst, 'reload schema';

COMMIT;
