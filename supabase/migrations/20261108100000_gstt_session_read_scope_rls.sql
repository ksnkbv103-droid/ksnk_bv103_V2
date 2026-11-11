-- GSTT: siết policy SELECT phiên VST/GSC theo phạm vi đọc của app
-- (applyVstHistoryReadScope — src/modules/giam-sat-vst/lib/vst-read-scope.ts;
--  applyGscHistoryReadScope — src/modules/giam-sat-chung/lib/gsc-read-scope.ts).
--
-- Lỗi (Cao): policy cũ cho mọi user có quyền 'view' đọc toàn viện qua PostgREST,
-- kể cả KHACH_THONG_KE_GSTT (chỉ được xem Thống kê) và MANG_LUOI_KSNK (chỉ khoa mình / phiên mình).
--
-- Quy tắc (khớp code app):
--   * ADMIN: như cũ (fn_sys_is_admin + policy "Admin full access").
--   * Có quyền <module>:view, phiên is_active, KHÔNG có vai KHACH_THONG_KE_GSTT, và một trong:
--       - có vai NHAN_VIEN_KSNK (toàn viện)
--       - không có vai MANG_LUOI_KSNK (vai khác: app không lọc → toàn viện)
--       - nguoi_giam_sat_id = nhân sự của mình
--       - khoa_id = khoa của mình
--   * gstt_fact_vst: cùng quy tắc, áp trên phiên cha.
-- Không ảnh hưởng: service_role (server actions, analytics cache), RPC SECURITY DEFINER.
-- View v_gstt_* / *_summary security_invoker=true tự hưởng theo bảng gốc.
--
-- Rollback: tạo lại 3 policy với qual cũ (xem pg_policies trước migration):
--   sessions: (select fn_sys_is_admin()) OR ((select fn_sys_has_permission('<MOD>','view')) AND COALESCE(is_active,true)=true)
--   fact_vst: (select fn_sys_is_admin()) OR ((select fn_sys_has_permission('GIAM_SAT_VST','view'))
--             AND EXISTS (select 1 from gstt_fact_vst_sessions s where s.id=session_id AND COALESCE(s.is_active,true)=true))
--   và DROP FUNCTION fn_sys_has_role(text), fn_sys_actor_nhan_su_id(), fn_sys_actor_khoa_id().

-- === Helper (cùng mẫu fn_sys_is_admin: STABLE, SECURITY DEFINER đọc sys_* / mdm_nhan_su) ===
CREATE OR REPLACE FUNCTION public.fn_sys_has_role(p_role text)
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
       AND r.name = upper(btrim(p_role))
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_sys_actor_nhan_su_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ns.id FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = auth.uid() AND ns.is_active = true
   LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sys_actor_khoa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ns.khoa_id FROM public.mdm_nhan_su ns
   WHERE ns.auth_user_id = auth.uid() AND ns.is_active = true
   LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.fn_sys_has_role(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sys_actor_nhan_su_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_sys_actor_khoa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sys_has_role(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sys_actor_nhan_su_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sys_actor_khoa_id() TO authenticated, service_role;

-- === gstt_fact_vst_sessions ===
DROP POLICY IF EXISTS "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions;
CREATE POLICY "vst_sessions_select_permission"
  ON public.gstt_fact_vst_sessions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.fn_sys_is_admin())
    OR (
      (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
      AND COALESCE(is_active, true) = true
      AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
      AND (
        (SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
        OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
        OR nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
        OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())
      )
    )
  );

-- === gstt_fact_chung_sessions ===
DROP POLICY IF EXISTS "gsc_sessions_select_permission" ON public.gstt_fact_chung_sessions;
CREATE POLICY "gsc_sessions_select_permission"
  ON public.gstt_fact_chung_sessions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.fn_sys_is_admin())
    OR (
      (SELECT public.fn_sys_has_permission('GIAM_SAT_CHUNG', 'view'))
      AND COALESCE(is_active, true) = true
      AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
      AND (
        (SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
        OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
        OR nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
        OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())
      )
    )
  );

-- === gstt_fact_vst (quan sát) — phạm vi theo phiên cha ===
DROP POLICY IF EXISTS "vst_obs_select_permission" ON public.gstt_fact_vst;
CREATE POLICY "vst_obs_select_permission"
  ON public.gstt_fact_vst
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.fn_sys_is_admin())
    OR (
      (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
      AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
      AND EXISTS (
        SELECT 1 FROM public.gstt_fact_vst_sessions s
         WHERE s.id = gstt_fact_vst.session_id
           AND COALESCE(s.is_active, true) = true
           AND (
             (SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
             OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
             OR s.nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
             OR s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())
           )
      )
    )
  );

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước/sau khi apply:
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname='public'
--      AND policyname IN ('vst_sessions_select_permission','gsc_sessions_select_permission','vst_obs_select_permission');
--   SELECT r.name, count(*) FROM sys_user_roles ur JOIN sys_roles r ON r.id=ur.role_id
--    WHERE r.name IN ('KHACH_THONG_KE_GSTT','MANG_LUOI_KSNK','NHAN_VIEN_KSNK') GROUP BY 1;
--   SELECT proname FROM pg_proc WHERE proname IN ('fn_sys_has_role','fn_sys_actor_nhan_su_id','fn_sys_actor_khoa_id');
