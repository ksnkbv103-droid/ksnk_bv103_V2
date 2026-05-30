-- Migration: RLS policies cho 12 bảng admin core.
-- Date: 26/05/2026
-- Slice 4 (admin-module hardening plan) - additive.
--
-- Mục tiêu:
--   * Đủ RLS để khi app chuyển từ `createAdminSupabaseClient` (service-role) → `createServerSupabaseUserClient`
--     (user JWT) thì các thao tác CRUD vẫn pass.
--   * Hiện tại service-role BYPASS RLS nên policy này không gây regression cho code đang chạy.
--   * Trục quyền:
--       - SELECT  → cần `DANH_MUC.view` (hoặc Admin)
--       - INSERT  → cần `DANH_MUC.create` (hoặc Admin)
--       - UPDATE  → cần `DANH_MUC.edit`   (hoặc Admin)
--       - DELETE  → cần `DANH_MUC.delete` (hoặc Admin) - nhưng app dùng soft-delete (UPDATE is_active=false)
--                   nên chính sách hiện trên trục `edit`.
--     Một số bảng đặc thù dùng module PHAN_QUYEN (RBAC) hoặc BANG_KIEM / NHAN_SU.
--
-- Idempotent: DROP POLICY IF EXISTS trước CREATE POLICY.

-- ----------------------------------------------------
-- 1. Helper functions: kiểm tra quyền (gọn, tái dùng)
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_auth_user_permissions
     WHERE auth_user_id = auth.uid()
       AND roles ? 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_sys_has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.v_auth_user_permissions
     WHERE auth_user_id = auth.uid()
       AND permissions @> jsonb_build_array(
             jsonb_build_object('module', p_module, 'action', p_action)
           )
  )
  OR public.fn_sys_is_admin();
$$;

COMMENT ON FUNCTION public.fn_sys_is_admin() IS 'true nếu auth.uid() có role ADMIN.';
COMMENT ON FUNCTION public.fn_sys_has_permission(text, text) IS 'true nếu user có quyền module/action (qua v_auth_user_permissions) hoặc là Admin.';

-- ----------------------------------------------------
-- 2. Helper attach RLS policy cho 1 bảng theo module quyền
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_attach_admin_rls(p_table regclass, p_module text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_short text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = p_table::oid AND relkind = 'r'
  ) THEN
    RAISE NOTICE '[rls] Bỏ qua %; không phải bảng vật lý.', p_table;
    RETURN;
  END IF;

  v_short := split_part(p_table::text, '.', 2);

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_short || '_select', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_short || '_select', p_table, p_module, 'view'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_short || '_insert', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_short || '_insert', p_table, p_module, 'create'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_short || '_update', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (public.fn_sys_has_permission(%L, %L)) WITH CHECK (public.fn_sys_has_permission(%L, %L))',
    v_short || '_update', p_table, p_module, 'edit', p_module, 'edit'
  );

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', v_short || '_delete', p_table);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (public.fn_sys_has_permission(%L, %L))',
    v_short || '_delete', p_table, p_module, 'delete'
  );

  RAISE NOTICE '[rls] Attached % policies (module=%) on %', 4, p_module, p_table;
END;
$$;

COMMENT ON FUNCTION public.fn_sys_attach_admin_rls(regclass, text) IS
  'Helper attach 4 policies (select/insert/update/delete) trên bảng admin theo module quyền (DANH_MUC/PHAN_QUYEN/BANG_KIEM/NHAN_SU).';

-- ----------------------------------------------------
-- 3. Áp dụng cho 12 bảng admin core
-- ----------------------------------------------------
DO $$
DECLARE
  v_pair jsonb;
  v_pairs jsonb := jsonb_build_array(
    -- (table, module)
    jsonb_build_array('public.sys_lookup_value',       'DANH_MUC'),
    jsonb_build_array('public.sys_mdm_registry',       'DANH_MUC'),
    jsonb_build_array('public.sys_mdm_suggestion',     'DANH_MUC'),
    jsonb_build_array('public.mdm_dm_khoa_phong',      'DANH_MUC'),
    jsonb_build_array('public.mdm_dm_khoi_khoa',       'DANH_MUC'),
    jsonb_build_array('public.mdm_nhan_su',            'NHAN_SU'),
    jsonb_build_array('public.gstt_dm_bang_kiem',      'BANG_KIEM'),
    jsonb_build_array('public.gstt_dm_tieu_chi_bang_kiem', 'BANG_KIEM'),
    jsonb_build_array('public.auth_dm_roles',          'PHAN_QUYEN'),
    jsonb_build_array('public.auth_dm_permissions',    'PHAN_QUYEN'),
    jsonb_build_array('public.auth_rel_role_permissions', 'PHAN_QUYEN'),
    jsonb_build_array('public.auth_rel_user_roles',    'PHAN_QUYEN')
  );
  v_fallback_pairs jsonb := jsonb_build_array(
    -- Fallback tên cũ (nếu DB chưa apply 000010)
    jsonb_build_array('public.sys_roles',              'PHAN_QUYEN'),
    jsonb_build_array('public.sys_permissions',        'PHAN_QUYEN'),
    jsonb_build_array('public.sys_role_permissions',   'PHAN_QUYEN'),
    jsonb_build_array('public.sys_user_roles',         'PHAN_QUYEN'),
    jsonb_build_array('public.dm_bang_kiem',           'BANG_KIEM'),
    jsonb_build_array('public.dm_tieu_chi_bang_kiem',  'BANG_KIEM')
  );
BEGIN
  FOR v_pair IN SELECT jsonb_array_elements(v_pairs) LOOP
    BEGIN
      PERFORM public.fn_sys_attach_admin_rls(
        (v_pair->>0)::regclass,
        (v_pair->>1)
      );
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '[rls-skip] Bảng % không tồn tại', v_pair->>0;
      WHEN OTHERS THEN
        RAISE NOTICE '[rls-skip] Lỗi % : %', v_pair->>0, SQLERRM;
    END;
  END LOOP;

  FOR v_pair IN SELECT jsonb_array_elements(v_fallback_pairs) LOOP
    BEGIN
      PERFORM public.fn_sys_attach_admin_rls(
        (v_pair->>0)::regclass,
        (v_pair->>1)
      );
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN OTHERS THEN
        RAISE NOTICE '[rls-fallback] Lỗi % : %', v_pair->>0, SQLERRM;
    END;
  END LOOP;
END $$;
