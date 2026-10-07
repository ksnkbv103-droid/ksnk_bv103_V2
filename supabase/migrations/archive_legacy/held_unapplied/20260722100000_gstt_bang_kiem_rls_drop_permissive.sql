-- Hoàn thiện RLS GSC/VST residual: gstt_dm_bang_kiem còn policy USING (true)
-- từ baseline, vô hiệu hóa gstt_dm_bang_kiem_{select,insert,update,delete}
-- (fn_sys_has_permission('BANG_KIEM', …)) vì Postgres OR permissive policies.
--
-- Impact: PostgREST authenticated chỉ đọc/ghi bảng kiểm khi có BANG_KIEM.* hoặc admin
--         (fn_sys_is_admin qua OR trong fn_sys_has_permission).
-- App Server Actions dùng service_role / verifyPermission — không đổi.
-- Rollback: recreate "Authenticated read access" / "Admin full access" USING (true).

BEGIN;

DROP POLICY IF EXISTS "Authenticated read access" ON public.gstt_dm_bang_kiem;
DROP POLICY IF EXISTS "Admin full access" ON public.gstt_dm_bang_kiem;

-- Giữ gstt_dm_bang_kiem_{select,insert,update,delete}; bổ sung admin explicit
-- để khớp pattern gstt fact sessions (fn_sys_is_admin OR permission).
DROP POLICY IF EXISTS "gstt_dm_bang_kiem_select" ON public.gstt_dm_bang_kiem;
DROP POLICY IF EXISTS "gstt_dm_bang_kiem_insert" ON public.gstt_dm_bang_kiem;
DROP POLICY IF EXISTS "gstt_dm_bang_kiem_update" ON public.gstt_dm_bang_kiem;
DROP POLICY IF EXISTS "gstt_dm_bang_kiem_delete" ON public.gstt_dm_bang_kiem;

CREATE POLICY "gstt_dm_bang_kiem_select" ON public.gstt_dm_bang_kiem
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('BANG_KIEM', 'view')
  );

CREATE POLICY "gstt_dm_bang_kiem_insert" ON public.gstt_dm_bang_kiem
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('BANG_KIEM', 'create')
  );

CREATE POLICY "gstt_dm_bang_kiem_update" ON public.gstt_dm_bang_kiem
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('BANG_KIEM', 'edit')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('BANG_KIEM', 'edit')
  );

CREATE POLICY "gstt_dm_bang_kiem_delete" ON public.gstt_dm_bang_kiem
  FOR DELETE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('BANG_KIEM', 'delete')
  );

COMMIT;
