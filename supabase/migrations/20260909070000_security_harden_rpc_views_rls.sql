-- Khóa cửa API khách + view PII + ngân hàng câu + phiếu TK.
-- Rollback: GRANT lại + DROP policy mới (giữ file này trong git).

BEGIN;

-- 1) Thu hồi EXECUTE của anon trên hàm SECURITY DEFINER công khai
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'rpc_assign_staff_ksnk_role',
        'rpc_cssd_apply_instrument_ledger',
        'fn_sync_overdue_tasks',
        'fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay',
        'fn_refresh_mv_gsc_session_daily',
        'fn_sync_dashboard_pre_aggregates',
        'rls_auto_enable',
        'fn_assert_vst_gsc_not_locked',
        'fn_cssd_check_set_heat_resistance',
        'fn_gstt_rca_gen_ma_ticket',
        'fn_inc_gia_han_so_lan',
        'fn_mdm_field_registry_attach_trigger',
        'fn_mdm_validate_lookup_integrity',
        'fn_qlcv_actor_is_ksnk',
        'fn_qlcv_can_read_fact',
        'fn_qlcv_get_actor_khoa_id',
        'fn_qlcv_ksnk_khoa_id',
        'fn_set_hoan_thanh_luc',
        'fn_sys_has_permission',
        'fn_sys_is_admin',
        'is_admin_user',
        'rpc_get_dashboard_ksnk_staff_supervision_stats',
        'rpc_get_registry_options'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;

-- Cron / refresh: chỉ service_role
REVOKE ALL ON FUNCTION public.fn_sync_overdue_tasks() FROM authenticated;
REVOKE ALL ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_overdue_tasks() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

-- Hàm RLS / app: authenticated + service
GRANT EXECUTE ON FUNCTION public.fn_sys_has_permission(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sys_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, service_role;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_user' AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, service_role';
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_can_read_fact() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_actor_is_ksnk() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_assign_staff_ksnk_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cssd_apply_instrument_ledger(uuid, uuid, uuid, uuid, text, integer, text, uuid, uuid) TO authenticated, service_role;

-- 2) Gác quyền trong hàm ghi (service_role = server đã verify; JWT user phải có quyền)
CREATE OR REPLACE FUNCTION public.rpc_assign_staff_ksnk_role(p_staff_id uuid, p_role_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_uid uuid;
  v_target_role_id uuid;
  v_ksnk_role_ids uuid[];
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Chưa đăng nhập.');
    END IF;
    IF NOT (public.fn_sys_is_admin() OR public.fn_sys_has_permission('PHAN_QUYEN', 'edit')) THEN
      RETURN json_build_object('success', false, 'error', 'Không đủ quyền gán vai trò.');
    END IF;
  END IF;

  SELECT auth_user_id INTO v_uid FROM public.mdm_nhan_su WHERE id = p_staff_id;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nhân sự chưa có tài khoản Auth.');
  END IF;

  IF p_role_name IS NULL OR upper(trim(p_role_name)) NOT IN (
    'HOI_DONG_KSNK', 'NHAN_VIEN_KSNK', 'MANG_LUOI_KSNK', 'KHACH_THONG_KE_GSTT'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vai trò không được phép gán. Chỉ: Hội đồng, Nhân viên KSNK, Mạng lưới KSNK, Khách.'
    );
  END IF;

  SELECT id INTO v_target_role_id
  FROM public.sys_roles
  WHERE name = upper(trim(p_role_name)) AND is_active = true
  LIMIT 1;
  IF v_target_role_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Vai trò mục tiêu không tồn tại hoặc đã ngưng hoạt động.');
  END IF;

  SELECT array_agg(id) INTO v_ksnk_role_ids
  FROM public.sys_roles
  WHERE name IN (
    'CAN_BO_KSNK', 'NHAN_VIEN_KHOA', 'GIAM_SAT_VIEN', 'NHAN_VIEN_KSNK',
    'HOI_DONG_KSNK', 'MANG_LUOI_KSNK', 'TO_TRUONG_MANG_LUOI_KSNK', 'THANH_VIEN_MANG_LUOI_KSNK',
    'KHACH_THONG_KE_GSTT', 'BAN_QLCL', 'KHOA_TRANG_BI'
  );

  DELETE FROM public.sys_user_roles
  WHERE user_id = v_uid
    AND role_id = ANY (coalesce(v_ksnk_role_ids, array[]::uuid[]));

  INSERT INTO public.sys_user_roles (user_id, role_id)
  VALUES (v_uid, v_target_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_cssd_apply_instrument_ledger(
  p_su_co_id uuid,
  p_loai_dung_cu_id uuid,
  p_bo_dung_cu_id uuid,
  p_quy_trinh_id uuid,
  p_loai_giao_dich text,
  p_so_luong_thay_doi integer,
  p_ghi_chu text DEFAULT NULL::text,
  p_bo_dung_cu_id_den uuid DEFAULT NULL::uuid,
  p_nguoi_thuc_hien_id uuid DEFAULT NULL::uuid
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  v_thuc_te integer;
  v_reserve integer;
  v_abs_qty integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Chưa đăng nhập.');
    END IF;
    IF NOT (
      public.fn_sys_is_admin()
      OR public.fn_sys_has_permission('BAO_SU_CO', 'create')
      OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Không đủ quyền ghi sổ dụng cụ.');
    END IF;
  END IF;

  IF p_loai_dung_cu_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Thiếu loại dụng cụ.');
  END IF;

  v_abs_qty := abs(p_so_luong_thay_doi);
  IF v_abs_qty <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Số lượng phải lớn hơn 0.');
  END IF;

  IF p_loai_giao_dich IN ('BAO_HONG', 'BAO_MAT', 'DIEU_CHUYEN') AND p_bo_dung_cu_id IS NOT NULL THEN
    SELECT COALESCE(SUM(tx.so_luong_thay_doi), 0)::integer + COALESCE(ct.so_luong, 0)::integer
      INTO v_thuc_te
      FROM public.cssd_dm_bo_dung_cu_chi_tiet ct
      LEFT JOIN public.cssd_fact_kho_giao_dich tx
        ON tx.loai_dung_cu_id = ct.loai_dung_cu_id
       AND tx.bo_dung_cu_id = ct.bo_dung_cu_id
       AND tx.is_active = true
     WHERE ct.bo_dung_cu_id = p_bo_dung_cu_id
       AND ct.loai_dung_cu_id = p_loai_dung_cu_id
       AND ct.is_active = true
     LIMIT 1;

    IF v_thuc_te IS NULL OR v_thuc_te < v_abs_qty THEN
      RETURN json_build_object(
        'success', false,
        'message', format('Số lượng vượt quá số thực tế (%s).', COALESCE(v_thuc_te, 0))
      );
    END IF;
  END IF;

  IF p_loai_giao_dich = 'BO_SUNG' THEN
    SELECT COALESCE(so_luong_kho_du_phong, 0)::integer
      INTO v_reserve
      FROM public.cssd_dm_loai_dung_cu
     WHERE id = p_loai_dung_cu_id
       AND is_active = true;

    IF v_reserve IS NULL OR v_reserve < v_abs_qty THEN
      RETURN json_build_object(
        'success', false,
        'message', format('Kho dự phòng không đủ (hiện có %s).', COALESCE(v_reserve, 0))
      );
    END IF;

    UPDATE public.cssd_dm_loai_dung_cu
       SET so_luong_kho_du_phong = v_reserve - v_abs_qty,
           updated_at = now()
     WHERE id = p_loai_dung_cu_id;
  END IF;

  INSERT INTO public.cssd_fact_kho_giao_dich (
    loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
    so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
  ) VALUES (
    p_loai_dung_cu_id, p_bo_dung_cu_id, p_quy_trinh_id, p_loai_giao_dich,
    p_so_luong_thay_doi, NULLIF(trim(p_ghi_chu), ''), p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
  );

  IF p_loai_giao_dich = 'DIEU_CHUYEN' AND p_bo_dung_cu_id_den IS NOT NULL THEN
    INSERT INTO public.cssd_fact_kho_giao_dich (
      loai_dung_cu_id, bo_dung_cu_id, quy_trinh_id, loai_giao_dich,
      so_luong_thay_doi, ghi_chu, su_co_id, nguoi_thuc_hien_id, created_at, updated_at
    ) VALUES (
      p_loai_dung_cu_id, p_bo_dung_cu_id_den, p_quy_trinh_id, 'DIEU_CHUYEN',
      v_abs_qty, COALESCE(NULLIF(trim(p_ghi_chu), ''), 'Nhận điều chuyển'),
      p_su_co_id, p_nguoi_thuc_hien_id, now(), now()
    );
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 3) View: quyền người gọi trên view đầy đủ; khóa anon
ALTER VIEW public.v_mdm_nhan_su_full SET (security_invoker = true);
ALTER VIEW public.v_cssd_bo_dung_cu_bien_dong SET (security_invoker = true);
ALTER VIEW public.v_cssd_bo_dung_cu_chi_tiet_realtime SET (security_invoker = true);

REVOKE ALL ON TABLE public.v_mdm_nhan_su_full FROM anon;
REVOKE ALL ON TABLE public.v_cssd_bo_dung_cu_bien_dong FROM anon;
REVOKE ALL ON TABLE public.v_cssd_bo_dung_cu_chi_tiet_realtime FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.v_mdm_nhan_su_full FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.v_cssd_bo_dung_cu_bien_dong FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.v_cssd_bo_dung_cu_chi_tiet_realtime FROM authenticated;

-- Picker không PII (id/tên/mã/khoa) — form chọn người vẫn dùng được
CREATE OR REPLACE VIEW public.v_mdm_nhan_su_picker
WITH (security_invoker = false) AS
SELECT id, ma_nv, ho_ten, khoa_id, is_active
FROM public.mdm_nhan_su
WHERE is_active = true;

COMMENT ON VIEW public.v_mdm_nhan_su_picker IS
  'Danh sách chọn nhân sự — không email/SĐT/ngày sinh/extra_data. Cố ý security_definer.';

REVOKE ALL ON TABLE public.v_mdm_nhan_su_picker FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.v_mdm_nhan_su_picker TO authenticated, service_role;

-- 4) Nhân sự: bỏ USING(true); chỉ bản thân hoặc quyền NHAN_SU
DROP POLICY IF EXISTS mdm_nhan_su_select_auth_v1 ON public.mdm_nhan_su;
DROP POLICY IF EXISTS mdm_nhan_su_select_authenticated ON public.mdm_nhan_su;

DROP POLICY IF EXISTS mdm_nhan_su_select_self ON public.mdm_nhan_su;
CREATE POLICY mdm_nhan_su_select_self
  ON public.mdm_nhan_su
  FOR SELECT
  TO authenticated
  USING (auth_user_id IS NOT NULL AND auth_user_id = auth.uid());

REVOKE ALL ON TABLE public.mdm_nhan_su FROM anon;

-- 5) Đào tạo: không lộ đáp án cho mọi tài khoản
DROP POLICY IF EXISTS dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_select
  ON public.dao_tao_cau_hoi
  FOR SELECT
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
  );

REVOKE ALL ON TABLE public.dao_tao_cau_hoi FROM anon;

DROP POLICY IF EXISTS dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_write
  ON public.dao_tao_cau_hoi
  FOR ALL
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  );

-- 6) Phiếu xin TK: chỉ service_role (app dùng admin client)
REVOKE ALL ON TABLE public.sys_account_access_request FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.sys_account_access_request TO service_role;

-- 7) Index FK nóng + gỡ index đôi
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_cap_phat ON public.cssd_fact_quy_trinh (nguoi_cap_phat_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_dang_giu ON public.cssd_fact_quy_trinh (nguoi_dang_giu_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_dong_goi ON public.cssd_fact_quy_trinh (nguoi_dong_goi_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_kiem_tra ON public.cssd_fact_quy_trinh (nguoi_kiem_tra_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_lam_sach ON public.cssd_fact_quy_trinh (nguoi_lam_sach_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_tiep_nhan ON public.cssd_fact_quy_trinh (nguoi_tiep_nhan_id);
CREATE INDEX IF NOT EXISTS idx_cssd_qt_nguoi_tiet_khuan ON public.cssd_fact_quy_trinh (nguoi_tiet_khuan_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_cv_nguoi_phu_trach ON public.qlcv_fact_cong_viec (nguoi_phu_trach_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_cv_nguoi_tao ON public.qlcv_fact_cong_viec (nguoi_tao_id);
CREATE INDEX IF NOT EXISTS idx_qlcv_cv_nguoi_giao ON public.qlcv_fact_cong_viec (nguoi_giao_viec_id);

DROP INDEX IF EXISTS public.idx_giam_sat_chung_supervisor;
DROP INDEX IF EXISTS public.idx_giam_sat_vst_session_id;
DROP INDEX IF EXISTS public.idx_giam_sat_vst_supervisor;

COMMIT;
