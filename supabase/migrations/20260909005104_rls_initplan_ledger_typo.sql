-- Bọc (select auth.uid()/role()) để RLS không tính lại từng dòng.
-- Sửa typo thông báo chưa đăng nhập trên rpc_cssd_apply_instrument_ledger.

ALTER POLICY dao_tao_lan_thi_insert ON public.dao_tao_lan_thi
  WITH CHECK (auth_user_id = (select auth.uid()));

ALTER POLICY dao_tao_lan_thi_select ON public.dao_tao_lan_thi
  USING (
    is_admin_user((select auth.uid()))
    OR fn_sys_has_permission('DAO_TAO'::text, 'view'::text)
    OR (auth_user_id = (select auth.uid()))
  );

ALTER POLICY dao_tao_lan_thi_update ON public.dao_tao_lan_thi
  USING (
    is_admin_user((select auth.uid()))
    OR fn_sys_has_permission('DAO_TAO'::text, 'edit'::text)
    OR (auth_user_id = (select auth.uid()))
  )
  WITH CHECK (
    is_admin_user((select auth.uid()))
    OR fn_sys_has_permission('DAO_TAO'::text, 'edit'::text)
    OR (auth_user_id = (select auth.uid()))
  );

ALTER POLICY "Admin full access" ON public.gstt_fact_chung_sessions
  USING (
    EXISTS (
      SELECT 1
      FROM sys_user_roles ur
      JOIN sys_roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
        AND r.name = 'ADMIN'::text
    )
  );

ALTER POLICY "Admin full access" ON public.gstt_fact_vst
  USING (
    EXISTS (
      SELECT 1
      FROM sys_user_roles ur
      JOIN sys_roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
        AND r.name = 'ADMIN'::text
    )
  );

ALTER POLICY "Authenticated read" ON public.gstt_fact_vst
  USING ((select auth.role()) = 'authenticated'::text);

ALTER POLICY "Admin full access" ON public.gstt_fact_vst_sessions
  USING (
    EXISTS (
      SELECT 1
      FROM sys_user_roles ur
      JOIN sys_roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
        AND r.name = 'ADMIN'::text
    )
  );

ALTER POLICY mdm_nhan_su_select_self ON public.mdm_nhan_su
  USING ((auth_user_id IS NOT NULL) AND (auth_user_id = (select auth.uid())));

ALTER POLICY permissions_admin_full_access_v2 ON public.sys_permissions
  USING (is_admin_user((select auth.uid())))
  WITH CHECK (is_admin_user((select auth.uid())));

ALTER POLICY role_permissions_admin_full_access_v2 ON public.sys_role_permissions
  USING (is_admin_user((select auth.uid())))
  WITH CHECK (is_admin_user((select auth.uid())));

ALTER POLICY roles_admin_full_access_v2 ON public.sys_roles
  USING (is_admin_user((select auth.uid())))
  WITH CHECK (is_admin_user((select auth.uid())));

ALTER POLICY user_roles_admin_full_access_v2 ON public.sys_user_roles
  USING (is_admin_user((select auth.uid())))
  WITH CHECK (is_admin_user((select auth.uid())));

ALTER POLICY user_roles_self_or_admin_select_v2 ON public.sys_user_roles
  USING ((user_id = (select auth.uid())) OR is_admin_user((select auth.uid())));

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
