-- Lát SEC-1 (handover-roadmap §5): thu quyền EXECUTE + siết RLS — gộp để lên prod một lần.
-- CHƯA APPLY PROD — chờ PO. Local: `npm run mdm:migrate:local`.
--
-- Đã grep app trước từng mục (app ghi qua admin client = service_role, BYPASSRLS):
--  1) rpc_dashboard_vst_strategic_analytics_impl: chỉ src/lib/analytics/strategic-analytics-cache.ts (admin client);
--     wrapper rpc_dashboard_vst_strategic_analytics là DEFINER → gọi _impl bằng quyền chủ hàm.
--     rpc_save_rbac_matrix: chỉ rbac.actions saveFullRBACMatrix (admin client sau ensureRbacAdmin).
--     rpc_get_dashboard_ksnk_staff_supervision_stats, fn_cssd_check_set_heat_resistance: không lời gọi .rpc() nào
--     trong src (chỉ scripts/sql chạy bằng postgres); không policy/view nào tham chiếu.
--     Hàm trigger / event trigger: Postgres không kiểm EXECUTE khi trigger chạy → client không cần EXECUTE.
--     GIỮ cho authenticated (RLS cần): fn_sys_has_permission, fn_sys_is_admin, is_admin_user, fn_qlcv_can_read_fact,
--     fn_qlcv_ksnk_khoa_id; rpc_gsc_checklist_detail, rpc_gsc_compare_matrices (client người dùng, guard trong hàm).
--     rpc_get_registry_options: ĐỂ NGUYÊN — cần PO quyết (có thể đang dùng cho dropdown phía client).
--  2) Default privileges: hàm do postgres tạo SAU migration này KHÔNG còn EXECUTE cho PUBLIC/anon/authenticated.
--     ⇒ Migration sau: hàm cần client (RLS helper, RPC gọi bằng client người dùng) phải
--        `GRANT EXECUTE ON FUNCTION … TO authenticated;` TƯỜNG MINH. Hàm trigger không cần.
--     Phải thu cả PUBLIC ở mức toàn cục (không IN SCHEMA): anon/authenticated kế thừa PUBLIC — đã thử trên local.
--  3) Đào tạo: src/modules/dao-tao/* chỉ dùng createAdminSupabaseClient cho dao_tao_lan_thi / dao_tao_cau_hoi;
--     requireDaoTaoUser chỉ dùng client người dùng để auth.getUser(). Không view/hàm DB nào đọc hai bảng.
--     dao_tao_cau_hinh: giữ policy (đọc kỳ thi published); chỉ thu DML/TRUNCATE của anon (anon không có policy).
--  4) Danh mục dụng cụ: mọi đường ghi cssd_dm_loai_dung_cu / cssd_dm_bo_dung_cu / cssd_dm_bo_dung_cu_chi_tiet
--     đi qua admin client (danh-muc actions sau requireCssdCatalogMasterWrite = ADMIN; duyệt đề nghị, đối soát bộ,
--     hủy sự cố cũng admin client; hàm ledger DEFINER chủ postgres). Không có xóa cứng (chỉ is_active=false)
--     ⇒ bỏ DELETE. Client người dùng chỉ SELECT (kho-dung-cu-giao-dich, bo-dung-cu-chi-tiet-read) — giữ SELECT.
--     cssd_dm_bo_phan_bo: KHÔNG đổi — app ghi bằng cổng BO_DC.edit (không phải ADMIN-only), khác kiểu.
--     FK cssd_fact_kho_giao_dich.loai_dung_cu_id: CASCADE → RESTRICT (xóa loại không được kéo mất sổ kho).
--  5) sys_roles / sys_permissions: rbac.actions + rbac-registry-sync + rbac-ksnk-role-mappings ghi qua admin client;
--     ensureRbacAdmin đã bỏ nhánh PHAN_QUYEN ⇒ policy ghi PHAN_QUYEN.* → fn_sys_is_admin().
--  6) v_sys_user_permissions + fn_sys_has_permission + fn_sys_is_admin + is_admin_user: lọc hồ sơ ns.is_active
--     và vai trò r.is_active, đồng nhất. Giữ nguyên chữ ký, LANGUAGE sql STABLE SECURITY DEFINER, search_path.
--     is_admin_user trước đây không cần hồ sơ nhân sự — nay cần hồ sơ ACTIVE (giống fn_sys_is_admin).
--     Break-glass (KSNK_BREAK_GLASS_EMAILS) là tầng app, không phụ thuộc DB; service_role bypass RLS — không bị khóa.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Hàm chỉ cho service_role (mọi overload theo tên)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        'rpc_dashboard_vst_strategic_analytics_impl',
        'rpc_save_rbac_matrix',
        'rpc_get_dashboard_ksnk_staff_supervision_stats',
        'fn_cssd_check_set_heat_resistance'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Hàm trigger / event trigger: chỉ thu khi kiểu trả về thật là trigger/event_trigger
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prorettype IN ('trigger'::regtype, 'event_trigger'::regtype)
      AND p.proname = ANY (ARRAY[
        'fn_assert_vst_gsc_not_locked',
        'fn_inc_gia_han_so_lan',
        'fn_mdm_field_registry_attach_trigger',
        'fn_mdm_validate_lookup_integrity',
        'fn_set_hoan_thanh_luc',
        'rls_auto_enable'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Khẳng định giữ cho authenticated (RLS / RPC client người dùng)
GRANT EXECUTE ON FUNCTION public.fn_sys_has_permission(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sys_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_can_read_fact() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_qlcv_ksnk_khoa_id() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Default privileges cho hàm tạo SAU (chủ postgres)
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Đào tạo: bài thi + ngân hàng câu hỏi chỉ qua server (service_role)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS dao_tao_lan_thi_insert ON public.dao_tao_lan_thi;
DROP POLICY IF EXISTS dao_tao_lan_thi_update ON public.dao_tao_lan_thi;
DROP POLICY IF EXISTS dao_tao_lan_thi_select ON public.dao_tao_lan_thi;
DROP POLICY IF EXISTS dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi;
DROP POLICY IF EXISTS dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.dao_tao_lan_thi FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.dao_tao_cau_hoi FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.dao_tao_cau_hinh FROM anon;
GRANT ALL ON TABLE public.dao_tao_lan_thi, public.dao_tao_cau_hoi TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Danh mục dụng cụ: ghi chỉ ADMIN, bỏ DELETE (app chỉ xóa mềm), giữ SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS cssd_dm_loai_dung_cu_insert ON public.cssd_dm_loai_dung_cu;
DROP POLICY IF EXISTS cssd_dm_loai_dung_cu_update ON public.cssd_dm_loai_dung_cu;
DROP POLICY IF EXISTS cssd_dm_loai_dung_cu_delete ON public.cssd_dm_loai_dung_cu;
CREATE POLICY cssd_dm_loai_dung_cu_insert ON public.cssd_dm_loai_dung_cu
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY cssd_dm_loai_dung_cu_update ON public.cssd_dm_loai_dung_cu
  FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_insert ON public.cssd_dm_bo_dung_cu;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_update ON public.cssd_dm_bo_dung_cu;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_delete ON public.cssd_dm_bo_dung_cu;
CREATE POLICY cssd_dm_bo_dung_cu_insert ON public.cssd_dm_bo_dung_cu
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY cssd_dm_bo_dung_cu_update ON public.cssd_dm_bo_dung_cu
  FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_insert ON public.cssd_dm_bo_dung_cu_chi_tiet;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_update ON public.cssd_dm_bo_dung_cu_chi_tiet;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_delete ON public.cssd_dm_bo_dung_cu_chi_tiet;
CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_insert ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_update ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()));

REVOKE DELETE, TRUNCATE ON TABLE public.cssd_dm_loai_dung_cu, public.cssd_dm_bo_dung_cu, public.cssd_dm_bo_dung_cu_chi_tiet
  FROM PUBLIC, anon, authenticated;

-- FK sổ kho → loại dụng cụ: CASCADE → RESTRICT. FK cũ đã VALID nên dữ liệu sạch; NOT VALID + VALIDATE giảm khóa.
ALTER TABLE public.cssd_fact_kho_giao_dich
  DROP CONSTRAINT IF EXISTS fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey;
ALTER TABLE public.cssd_fact_kho_giao_dich
  ADD CONSTRAINT fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey
  FOREIGN KEY (loai_dung_cu_id) REFERENCES public.cssd_dm_loai_dung_cu(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.cssd_fact_kho_giao_dich
  VALIDATE CONSTRAINT fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey;

-- ---------------------------------------------------------------------------
-- 5) sys_roles / sys_permissions: ghi chỉ ADMIN (bỏ nhánh PHAN_QUYEN.*)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sys_roles_insert ON public.sys_roles;
DROP POLICY IF EXISTS sys_roles_update ON public.sys_roles;
DROP POLICY IF EXISTS sys_roles_delete ON public.sys_roles;
CREATE POLICY sys_roles_insert ON public.sys_roles
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_roles_update ON public.sys_roles
  FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_roles_delete ON public.sys_roles
  FOR DELETE TO authenticated USING ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS sys_permissions_insert ON public.sys_permissions;
DROP POLICY IF EXISTS sys_permissions_update ON public.sys_permissions;
DROP POLICY IF EXISTS sys_permissions_delete ON public.sys_permissions;
CREATE POLICY sys_permissions_insert ON public.sys_permissions
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_permissions_update ON public.sys_permissions
  FOR UPDATE TO authenticated USING ((SELECT public.fn_sys_is_admin())) WITH CHECK ((SELECT public.fn_sys_is_admin()));
CREATE POLICY sys_permissions_delete ON public.sys_permissions
  FOR DELETE TO authenticated USING ((SELECT public.fn_sys_is_admin()));

-- ---------------------------------------------------------------------------
-- 6) Lọc hồ sơ nhân sự + vai trò đang hoạt động (view và hàm đồng nhất)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sys_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.mdm_nhan_su ns
      JOIN public.sys_user_roles ur ON ur.user_id = ns.auth_user_id
      JOIN public.sys_roles r       ON r.id = ur.role_id
     WHERE ns.auth_user_id = auth.uid()
       AND ns.is_active = true
       AND r.is_active = true
       AND r.name = 'ADMIN'
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_sys_has_permission(p_module text, p_action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.mdm_nhan_su ns
      JOIN public.sys_user_roles ur       ON ur.user_id = ns.auth_user_id
      JOIN public.sys_roles r             ON r.id = ur.role_id
      JOIN public.sys_role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.sys_permissions p       ON p.id = rp.permission_id
     WHERE ns.auth_user_id = auth.uid()
       AND ns.is_active = true
       AND r.is_active = true
       AND p.module_name = p_module
       AND p.action = p_action
  )
  OR public.fn_sys_is_admin();
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.mdm_nhan_su ns
    JOIN public.sys_user_roles ur ON ur.user_id = ns.auth_user_id
    JOIN public.sys_roles r ON r.id = ur.role_id
    WHERE ns.auth_user_id = COALESCE(p_user_id, auth.uid())
      AND ns.is_active = true
      AND r.is_active = true
      AND r.name = 'ADMIN'
  );
$function$;

-- View: giữ nguyên cột + thứ tự; hồ sơ ngưng → roles/permissions rỗng (không còn quyền ở mọi cổng app).
CREATE OR REPLACE VIEW public.v_sys_user_permissions
WITH (security_invoker = true) AS
 WITH user_perms AS (
         SELECT ur.user_id,
            jsonb_agg(DISTINCT r.name) AS roles,
            jsonb_agg(DISTINCT jsonb_build_object('module', p.module_name, 'action', p.action)) AS permissions
           FROM sys_user_roles ur
             JOIN sys_roles r ON ur.role_id = r.id AND r.is_active = true
             LEFT JOIN sys_role_permissions rp ON r.id = rp.role_id
             LEFT JOIN sys_permissions p ON rp.permission_id = p.id
          GROUP BY ur.user_id
        )
 SELECT ns.id AS staff_id,
    ns.auth_user_id,
    ns.ho_ten,
    ns.ma_nv,
    ns.extra_data ->> 'email'::text AS email,
    ns.khoa_id,
    ns.is_active,
    k.ten_khoa AS ten_khoa_phong,
    k.ma_khoa AS ma_khoa_phong,
    COALESCE(up.roles, '[]'::jsonb) AS roles,
    COALESCE(up.permissions, '[]'::jsonb) AS permissions
   FROM mdm_nhan_su ns
     LEFT JOIN mdm_dm_khoa_phong k ON ns.khoa_id = k.id
     LEFT JOIN user_perms up ON ns.auth_user_id = up.user_id AND ns.is_active = true;

COMMIT;

-- ===========================================================================
-- CHƯA APPLY PROD — chờ PO. Trước khi apply prod, chạy kiểm rủi ro khóa admin:
--   SELECT ur.user_id, ns.id, ns.is_active FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--     LEFT JOIN mdm_nhan_su ns ON ns.auth_user_id = ur.user_id
--    WHERE r.name = 'ADMIN' AND (ns.id IS NULL OR ns.is_active IS NOT TRUE);   -- phải 0 dòng (hoặc PO chấp nhận)
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.cssd_fact_kho_giao_dich'::regclass
--    AND contype = 'f' AND pg_get_constraintdef(oid) ~ 'loai_dung_cu_id';   -- tên phải khớp, nếu khác sửa trước
--
-- Kiểm sau apply:
--   SELECT has_function_privilege('anon','public.rpc_dashboard_vst_strategic_analytics_impl(date,date,uuid[],uuid[],uuid[],uuid[],text[])','EXECUTE'); -- f
--   SELECT has_function_privilege('authenticated','public.rpc_save_rbac_matrix(jsonb)','EXECUTE');                -- f
--   SELECT has_function_privilege('authenticated','public.rpc_get_dashboard_ksnk_staff_supervision_stats(date,date,uuid[],uuid[],uuid[],uuid[])','EXECUTE'); -- f
--   SELECT has_function_privilege('authenticated','public.fn_cssd_check_set_heat_resistance(uuid)','EXECUTE');    -- f
--   SELECT has_function_privilege('service_role','public.rpc_save_rbac_matrix(jsonb)','EXECUTE');                 -- t
--   SELECT has_function_privilege('authenticated','public.fn_sys_has_permission(text,text)','EXECUTE');           -- t
--   SELECT has_function_privilege('authenticated','public.rpc_gsc_compare_matrices(date,date,uuid[],uuid[],uuid[],uuid[],text[],text[])','EXECUTE'); -- t
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('dao_tao_lan_thi','dao_tao_cau_hoi'); -- 0 dòng
--   SELECT privilege_type FROM information_schema.role_table_grants
--    WHERE table_name = 'dao_tao_lan_thi' AND grantee IN ('anon','authenticated');            -- không còn INSERT/UPDATE/DELETE
--   SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename = 'cssd_dm_loai_dung_cu'; -- không DELETE; ghi = fn_sys_is_admin
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'fact_kho_dung_cu_giao_dich_loai_dung_cu_id_fkey'; -- ON DELETE RESTRICT
--   SELECT defaclrole::regrole, defaclnamespace, defaclacl FROM pg_default_acl WHERE defaclobjtype = 'f';  -- không anon/authenticated/=X
-- ===========================================================================
