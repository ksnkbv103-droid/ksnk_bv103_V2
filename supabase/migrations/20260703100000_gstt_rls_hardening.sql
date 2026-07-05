-- G-11 / S-RLS-01: siết RLS gstt_fact_* — bỏ policy đọc mở toàn bộ ("Authenticated read access"
-- qual = true) vốn vô hiệu hóa các policy lọc is_active (permissive OR với nhau).
--
-- Impact map:
--   * App (server actions) dùng service_role → bypass RLS, không ảnh hưởng.
--   * Truy cập trực tiếp PostgREST bằng anon/authenticated: nay phải có quyền
--     GIAM_SAT_VST/GIAM_SAT_CHUNG 'view' (theo pattern QLCV fn_qlcv_can_read_fact).
--   * Policy "Admin full access" (ADMIN qua sys_user_roles) giữ nguyên.
-- Rollback: recreate policy "Authenticated read access" FOR SELECT TO authenticated USING (true)
--   trên 3 bảng, và 2 policy *_select_authenticated cũ (COALESCE(is_active,true)=true).

-- === gstt_fact_vst_sessions ===
DROP POLICY IF EXISTS "Authenticated read access" ON public.gstt_fact_vst_sessions;
DROP POLICY IF EXISTS "vst_sessions_select_authenticated" ON public.gstt_fact_vst_sessions;

CREATE POLICY "vst_sessions_select_permission"
  ON public.gstt_fact_vst_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR (
      public.fn_sys_has_permission('GIAM_SAT_VST', 'view')
      AND COALESCE(is_active, true) = true
    )
  );

-- === gstt_fact_vst (quan sát/opportunity) ===
DROP POLICY IF EXISTS "Authenticated read access" ON public.gstt_fact_vst;

CREATE POLICY "vst_obs_select_permission"
  ON public.gstt_fact_vst
  FOR SELECT
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('GIAM_SAT_VST', 'view')
  );

-- === gstt_fact_chung_sessions (GSC) ===
DROP POLICY IF EXISTS "Authenticated read access" ON public.gstt_fact_chung_sessions;
DROP POLICY IF EXISTS "gsc_sessions_select_authenticated" ON public.gstt_fact_chung_sessions;

CREATE POLICY "gsc_sessions_select_permission"
  ON public.gstt_fact_chung_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR (
      public.fn_sys_has_permission('GIAM_SAT_CHUNG', 'view')
      AND COALESCE(is_active, true) = true
    )
  );
