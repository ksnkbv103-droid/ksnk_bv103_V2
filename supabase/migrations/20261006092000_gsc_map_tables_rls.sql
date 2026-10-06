-- GSC map tables RLS (advisor: rls_disabled_in_public)
-- Bảng: gstt_map_tieu_chi_orphan, gstt_map_bang_kiem_short_long, gstt_map_tieu_chi_merge
--
-- SELECT USING (true) cho mọi authenticated — KHÔNG gắn quyền giám sát:
-- view gstt_fact_gsc_violations_summary (security_invoker) và các hàm SECURITY INVOKER
-- (fn_gsc_resolve_criterion_*, fn_gsc_expand_session_results_for_tc) đọc các bảng này
-- dưới quyền người gọi; nếu SELECT bị siết theo quyền GSC thì view/hàm trả rỗng
-- với user authenticated không có quyền đó.
-- Ghi (INSERT/UPDATE/DELETE) chỉ admin qua fn_sys_is_admin().
-- Không đụng policy gstt_dm_bang_kiem / mdm_dm_khoa_phong (đã có trên prod).

BEGIN;

-- ── gstt_map_tieu_chi_orphan ───────────────────────────────────────────────
ALTER TABLE public.gstt_map_tieu_chi_orphan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gstt_map_tieu_chi_orphan FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.gstt_map_tieu_chi_orphan FROM authenticated;

DROP POLICY IF EXISTS gstt_map_tieu_chi_orphan_select_authenticated ON public.gstt_map_tieu_chi_orphan;
CREATE POLICY gstt_map_tieu_chi_orphan_select_authenticated
  ON public.gstt_map_tieu_chi_orphan
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS gstt_map_tieu_chi_orphan_insert_admin ON public.gstt_map_tieu_chi_orphan;
CREATE POLICY gstt_map_tieu_chi_orphan_insert_admin
  ON public.gstt_map_tieu_chi_orphan
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_tieu_chi_orphan_update_admin ON public.gstt_map_tieu_chi_orphan;
CREATE POLICY gstt_map_tieu_chi_orphan_update_admin
  ON public.gstt_map_tieu_chi_orphan
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin())
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_tieu_chi_orphan_delete_admin ON public.gstt_map_tieu_chi_orphan;
CREATE POLICY gstt_map_tieu_chi_orphan_delete_admin
  ON public.gstt_map_tieu_chi_orphan
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin());

-- ── gstt_map_bang_kiem_short_long ──────────────────────────────────────────
ALTER TABLE public.gstt_map_bang_kiem_short_long ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gstt_map_bang_kiem_short_long FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.gstt_map_bang_kiem_short_long FROM authenticated;

DROP POLICY IF EXISTS gstt_map_bang_kiem_short_long_select_authenticated ON public.gstt_map_bang_kiem_short_long;
CREATE POLICY gstt_map_bang_kiem_short_long_select_authenticated
  ON public.gstt_map_bang_kiem_short_long
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS gstt_map_bang_kiem_short_long_insert_admin ON public.gstt_map_bang_kiem_short_long;
CREATE POLICY gstt_map_bang_kiem_short_long_insert_admin
  ON public.gstt_map_bang_kiem_short_long
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_bang_kiem_short_long_update_admin ON public.gstt_map_bang_kiem_short_long;
CREATE POLICY gstt_map_bang_kiem_short_long_update_admin
  ON public.gstt_map_bang_kiem_short_long
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin())
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_bang_kiem_short_long_delete_admin ON public.gstt_map_bang_kiem_short_long;
CREATE POLICY gstt_map_bang_kiem_short_long_delete_admin
  ON public.gstt_map_bang_kiem_short_long
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin());

-- ── gstt_map_tieu_chi_merge ────────────────────────────────────────────────
ALTER TABLE public.gstt_map_tieu_chi_merge ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gstt_map_tieu_chi_merge FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.gstt_map_tieu_chi_merge FROM authenticated;

DROP POLICY IF EXISTS gstt_map_tieu_chi_merge_select_authenticated ON public.gstt_map_tieu_chi_merge;
CREATE POLICY gstt_map_tieu_chi_merge_select_authenticated
  ON public.gstt_map_tieu_chi_merge
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS gstt_map_tieu_chi_merge_insert_admin ON public.gstt_map_tieu_chi_merge;
CREATE POLICY gstt_map_tieu_chi_merge_insert_admin
  ON public.gstt_map_tieu_chi_merge
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_tieu_chi_merge_update_admin ON public.gstt_map_tieu_chi_merge;
CREATE POLICY gstt_map_tieu_chi_merge_update_admin
  ON public.gstt_map_tieu_chi_merge
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin())
  WITH CHECK (public.fn_sys_is_admin());

DROP POLICY IF EXISTS gstt_map_tieu_chi_merge_delete_admin ON public.gstt_map_tieu_chi_merge;
CREATE POLICY gstt_map_tieu_chi_merge_delete_admin
  ON public.gstt_map_tieu_chi_merge
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin());

-- Chặn quyền mặc định cấp cho anon trên bảng/view mới do role postgres tạo
-- (pg_default_acl prod: anon=arwd). Không đụng bảng hiện có, sequences, functions, authenticated.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
