-- VST-006: policy ALL "Admin full access" trên 3 bảng GSTT chỉ so tên vai ADMIN,
-- không kiểm mdm_nhan_su.is_active / sys_roles.is_active. Admin bị vô hiệu hồ sơ
-- mà còn JWT vẫn đọc toàn bộ (kể cả phiên xóa mềm) và UPDATE được qua PostgREST.
-- Sửa: dùng (SELECT fn_sys_is_admin()) — cùng điều kiện với các policy SELECT
-- phạm vi (675a8bc6). Giữ nguyên tên, lệnh ALL, vai authenticated, không WITH CHECK
-- (USING áp cho cả INSERT/UPDATE như trước). Không đụng policy khác.

BEGIN;

DROP POLICY IF EXISTS "Admin full access" ON public.gstt_fact_vst_sessions;
CREATE POLICY "Admin full access" ON public.gstt_fact_vst_sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.gstt_fact_chung_sessions;
CREATE POLICY "Admin full access" ON public.gstt_fact_chung_sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.gstt_fact_vst;
CREATE POLICY "Admin full access" ON public.gstt_fact_vst
  AS PERMISSIVE FOR ALL TO authenticated
  USING ((SELECT public.fn_sys_is_admin()));

COMMIT;

-- ---------------------------------------------------------------------------
-- HOÀN TÁC (chạy tay nếu cần trả về hành vi cũ):
-- BEGIN;
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY['gstt_fact_vst_sessions','gstt_fact_chung_sessions','gstt_fact_vst'] LOOP
--     EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);
--     EXECUTE format($p$CREATE POLICY "Admin full access" ON public.%I AS PERMISSIVE FOR ALL TO authenticated
--       USING (EXISTS (SELECT 1 FROM public.sys_user_roles ur JOIN public.sys_roles r ON ur.role_id = r.id
--                      WHERE ur.user_id = (SELECT auth.uid()) AND r.name = 'ADMIN'))$p$, t);
--   END LOOP;
-- END $$;
-- COMMIT;
-- ---------------------------------------------------------------------------
-- CHƯA APPLY PROD — chờ PO
--
-- Kiểm prod TRƯỚC khi apply (chỉ đọc):
-- 1) Admin nào sẽ mất quyền (có vai ADMIN nhưng không có nhân sự active / vai inactive):
--   SELECT ur.user_id, ns.id AS nhan_su_id, ns.is_active AS ns_active, r.is_active AS role_active
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--     LEFT JOIN mdm_nhan_su ns ON ns.auth_user_id = ur.user_id
--    WHERE r.name = 'ADMIN';
-- 2) Sau khi apply:
--   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
--    WHERE tablename IN ('gstt_fact_vst_sessions','gstt_fact_chung_sessions','gstt_fact_vst')
--    ORDER BY 1, 2;
