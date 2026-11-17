-- QT-010: người có NHAN_SU:edit/delete nhưng KHÔNG phải ADMIN không được UPDATE/DELETE hồ sơ
-- mdm_nhan_su gắn với tài khoản mang vai ADMIN, và không được gắn uid của tài khoản ADMIN vào hồ sơ.
--
-- CHƯA APPLY PROD — chờ PO. Chỉ mới áp local.
--
-- Căn cứ (DB local + mã, 2026-11-12):
--   - mdm_nhan_su_update: USING và WITH CHECK chỉ fn_sys_has_permission('NHAN_SU','edit') → gọi thẳng
--     PostgREST có thể tắt is_active / đổi auth_user_id của hồ sơ ADMIN (ADMIN mất quyền vì
--     fn_sys_is_admin đòi ns.is_active), hoặc gắn uid của ADMIN sang hồ sơ khác. Chốt hiện chỉ ở action.
--   - mdm_nhan_su_delete: chỉ fn_sys_has_permission('NHAN_SU','delete') → cùng lỗ hổng (xóa hồ sơ ADMIN
--     làm fn_sys_is_admin của người đó trả false) → chặn tương tự.
--   - is_admin_user(uuid) không dùng được: COALESCE(p_user_id, auth.uid()) và đòi ns.is_active = true.
-- Thiết kế:
--   - Hàm mới fn_sys_tai_khoan_mang_vai_admin(uuid): chỉ xét sys_user_roles + sys_roles, KHÔNG lọc
--     ns.is_active (hồ sơ ADMIN đang tắt vẫn được bảo vệ, người không ADMIN không bật lại được) và
--     KHÔNG lọc r.is_active (vai ADMIN tạm tắt rồi bật lại sẽ trả quyền cho các tài khoản này, nên vẫn
--     cần bảo vệ). NULL → false.
--   - Thêm 2 policy RESTRICTIVE (additive, không sửa policy cũ). ADMIN (fn_sys_is_admin) giữ nguyên quyền.
--   - service_role (BYPASSRLS) không bị ảnh hưởng.
-- Ảnh hưởng: người không ADMIN gọi thẳng PostgREST sửa/xóa hồ sơ ADMIN nhận 0 dòng; đổi auth_user_id
--   sang uid ADMIN nhận lỗi RLS. Hồ sơ thường không đổi. Ứng dụng không đổi.
--
-- Khôi phục (rollback):
--   DROP POLICY IF EXISTS mdm_nhan_su_update_chan_ho_so_admin ON public.mdm_nhan_su;
--   DROP POLICY IF EXISTS mdm_nhan_su_delete_chan_ho_so_admin ON public.mdm_nhan_su;
--   DROP FUNCTION IF EXISTS public.fn_sys_tai_khoan_mang_vai_admin(uuid);

CREATE OR REPLACE FUNCTION public.fn_sys_tai_khoan_mang_vai_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_user_id IS NOT NULL
     AND EXISTS (
       SELECT 1
         FROM public.sys_user_roles ur
         JOIN public.sys_roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND r.name = 'ADMIN'
     );
$$;

REVOKE ALL ON FUNCTION public.fn_sys_tai_khoan_mang_vai_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_sys_tai_khoan_mang_vai_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_sys_tai_khoan_mang_vai_admin(uuid) TO authenticated, service_role;

CREATE POLICY mdm_nhan_su_update_chan_ho_so_admin ON public.mdm_nhan_su
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.fn_sys_is_admin()) OR NOT public.fn_sys_tai_khoan_mang_vai_admin(auth_user_id))
  WITH CHECK ((SELECT public.fn_sys_is_admin()) OR NOT public.fn_sys_tai_khoan_mang_vai_admin(auth_user_id));

CREATE POLICY mdm_nhan_su_delete_chan_ho_so_admin ON public.mdm_nhan_su
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING ((SELECT public.fn_sys_is_admin()) OR NOT public.fn_sys_tai_khoan_mang_vai_admin(auth_user_id));

-- SQL kiểm prod (CHỈ ĐỌC), chạy trước/sau khi áp — sau khi áp phải thấy 2 policy RESTRICTIVE và
-- hàm: authenticated = t, anon = f, service_role = t:
--   SELECT policyname, permissive, cmd, qual, with_check
--     FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mdm_nhan_su' ORDER BY policyname;
--   SELECT p.oid::regprocedure, p.prosecdef, p.proconfig,
--          has_function_privilege('authenticated', p.oid, 'execute') AS authenticated,
--          has_function_privilege('anon', p.oid, 'execute') AS anon,
--          has_function_privilege('service_role', p.oid, 'execute') AS service_role
--     FROM pg_proc p
--    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_sys_tai_khoan_mang_vai_admin';
