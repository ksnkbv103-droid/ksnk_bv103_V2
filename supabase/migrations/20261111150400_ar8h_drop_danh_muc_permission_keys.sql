-- AR-8h (PO duyệt 2026-11-11, xác nhận destructive): bỏ khóa quyền DANH_MUC, DANH_MUC_GSTT, DANH_MUC_CSSD_LOOKUP.
-- Giữ DANH_MUC_ORG (module /to-chuc). Ghi lookup chỉ ADMIN (PO 2026-11-11); đọc sys_lookup_value = mọi user đăng nhập
-- (dữ liệu tham chiếu, PO chọn 2026-11-11). Idempotent: chạy lại an toàn.
-- Thứ tự: viết lại policy -> xóa grant -> xóa quyền (fn_sys_has_permission vẫn OR fn_sys_is_admin()).

BEGIN;

-- 1) sys_lookup_value: đọc = authenticated; ghi = ADMIN
DROP POLICY IF EXISTS sys_lookup_value_select ON public.sys_lookup_value;
CREATE POLICY sys_lookup_value_select ON public.sys_lookup_value
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sys_lookup_value_insert ON public.sys_lookup_value;
CREATE POLICY sys_lookup_value_insert ON public.sys_lookup_value
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS sys_lookup_value_update ON public.sys_lookup_value;
CREATE POLICY sys_lookup_value_update ON public.sys_lookup_value
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS sys_lookup_value_delete ON public.sys_lookup_value;
CREATE POLICY sys_lookup_value_delete ON public.sys_lookup_value
  FOR DELETE TO authenticated USING ((SELECT public.fn_sys_is_admin()));

-- 2) mdm_dm_khoa_phong: ghi theo khóa KHOA_PHONG (hiện chỉ ADMIN có quyền ghi); SELECT policy không đổi
DROP POLICY IF EXISTS mdm_dm_khoa_phong_insert ON public.mdm_dm_khoa_phong;
CREATE POLICY mdm_dm_khoa_phong_insert ON public.mdm_dm_khoa_phong
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.fn_sys_has_permission('KHOA_PHONG', 'create')));

DROP POLICY IF EXISTS mdm_dm_khoa_phong_update ON public.mdm_dm_khoa_phong;
CREATE POLICY mdm_dm_khoa_phong_update ON public.mdm_dm_khoa_phong
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_has_permission('KHOA_PHONG', 'edit')))
  WITH CHECK ((SELECT public.fn_sys_has_permission('KHOA_PHONG', 'edit')));

DROP POLICY IF EXISTS mdm_dm_khoa_phong_delete ON public.mdm_dm_khoa_phong;
CREATE POLICY mdm_dm_khoa_phong_delete ON public.mdm_dm_khoa_phong
  FOR DELETE TO authenticated
  USING ((SELECT public.fn_sys_has_permission('KHOA_PHONG', 'delete')));

-- 3) sys_mdm_registry / sys_mdm_suggestion: tab Hệ thống (IT/MDM) chỉ ADMIN
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sys_mdm_registry', 'sys_mdm_suggestion'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.fn_sys_is_admin()))', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()))', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()))', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.fn_sys_is_admin()))', t || '_delete', t);
  END LOOP;
END $$;

-- 4) cssd_dm_bo_dung_cu(_chi_tiet): bỏ nhánh DANH_MUC_CSSD_LOOKUP (mọi role có khóa này đều có BO_DC/CSSD_* view)
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_select_cssd_any_view ON public.cssd_dm_bo_dung_cu;
CREATE POLICY cssd_dm_bo_dung_cu_select_cssd_any_view ON public.cssd_dm_bo_dung_cu
  FOR SELECT TO authenticated
  USING (
    (SELECT public.fn_sys_has_permission('BO_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('DC_LE', 'view'))
    OR (SELECT public.fn_sys_has_permission('LOAI_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('THIET_BI', 'view'))
    OR (SELECT public.fn_sys_has_permission('HOA_CHAT', 'view'))
    OR (SELECT public.fn_sys_has_permission('BAO_SU_CO', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_REPORT', 'view'))
  );

DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_select_cssd_any_view ON public.cssd_dm_bo_dung_cu_chi_tiet;
CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_select_cssd_any_view ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR SELECT TO authenticated
  USING (
    (SELECT public.fn_sys_has_permission('BO_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('DC_LE', 'view'))
    OR (SELECT public.fn_sys_has_permission('LOAI_DC', 'view'))
    OR (SELECT public.fn_sys_has_permission('THIET_BI', 'view'))
    OR (SELECT public.fn_sys_has_permission('HOA_CHAT', 'view'))
    OR (SELECT public.fn_sys_has_permission('BAO_SU_CO', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_WORKFLOW', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_ME_TIET_KHUAN', 'view'))
    OR (SELECT public.fn_sys_has_permission('CSSD_REPORT', 'view'))
  );

-- 5) Xóa grant rồi xóa quyền
DELETE FROM public.sys_role_permissions rp
USING public.sys_permissions p
WHERE p.id = rp.permission_id
  AND p.module_name IN ('DANH_MUC', 'DANH_MUC_GSTT', 'DANH_MUC_CSSD_LOOKUP');

DELETE FROM public.sys_permissions
WHERE module_name IN ('DANH_MUC', 'DANH_MUC_GSTT', 'DANH_MUC_CSSD_LOOKUP');

-- 6) Chặn sót: không còn policy nào tham chiếu 3 khóa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '''(DANH_MUC|DANH_MUC_GSTT|DANH_MUC_CSSD_LOOKUP)''::text'
  ) THEN
    RAISE EXCEPTION 'AR-8h: còn policy tham chiếu DANH_MUC/DANH_MUC_GSTT/DANH_MUC_CSSD_LOOKUP';
  END IF;
END $$;

COMMIT;
