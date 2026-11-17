-- VST-015 (Cao): siết policy SELECT phiên/quan sát Vệ sinh tay cho CHU_NHIEM_KHOA và HOI_DONG_KSNK.
--
-- Mục đích:
--   Policy của 20261108100000 có nhóm cuối `NHAN_VIEN_KSNK OR NOT MANG_LUOI_KSNK OR ns OR khoa`
--   → mọi vai không phải mạng lưới (kể cả CNK, HĐ) đọc toàn viện, kèm danh tính, khi gọi thẳng
--   PostgREST bằng JWT user. Tầng app đã chặn (VST-014, src/modules/giam-sat-vst/lib/vst-read-scope.ts);
--   migration này đưa cùng quy tắc xuống DB.
--
-- Nhóm cuối mới (thứ tự ưu tiên khớp applyVstHistoryReadScope):
--   * có NHAN_VIEN_KSNK (kể cả kèm vai khác)              → toàn bộ phiên is_active
--   * không NV_KSNK, có MANG_LUOI_KSNK                      → nguoi_giam_sat_id = mình OR khoa_id = khoa mình
--   * không NV_KSNK/MANG_LUOI, có CHU_NHIEM_KHOA (kể cả +HĐ) → khoa_id = khoa mình (khoa NULL ⇒ 0 dòng)
--   * không NV_KSNK/MANG_LUOI/CNK, có HOI_DONG_KSNK         → 0 dòng (kể cả HĐ + vai khác)
--   * còn lại (vai khác đã qua quyền view)                  → toàn bộ
--   Giữ nguyên: nhánh fn_sys_is_admin(), quyền GIAM_SAT_VST:view, is_active, loại KHACH_THONG_KE_GSTT.
--
-- Ảnh hưởng sau khi áp:
--   * CNK chỉ thấy phiên/quan sát của khoa mình; HĐ thuần thấy 0; ADMIN/NV KSNK/mạng lưới/vai khác như cũ.
--   * App đọc VST bằng admin client (service_role) nên hành vi app KHÔNG đổi; đây là lớp chặn đường
--     PostgREST trực tiếp và hai view security_invoker v_gstt_giam_sat_vst_sessions_full,
--     v_gstt_giam_sat_vst_full (tự hưởng theo bảng gốc).
--   * RPC thống kê SECURITY DEFINER không đổi. Policy "Admin full access" và policy GSC
--     (gsc_sessions_select_permission — thuộc VST-023) không đụng.
--
-- Phụ thuộc: helper của 20261108100000_gstt_session_read_scope_rls.sql
--   fn_sys_has_role(text), fn_sys_actor_nhan_su_id(), fn_sys_actor_khoa_id() (STABLE SECURITY DEFINER).
--
-- HOÀN TÁC (tạo lại hai policy với điều kiện của 20261108100000):
--   DROP POLICY IF EXISTS "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions;
--   CREATE POLICY "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions
--     FOR SELECT TO authenticated USING (
--       (SELECT public.fn_sys_is_admin())
--       OR ((SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
--           AND COALESCE(is_active, true) = true
--           AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
--           AND ((SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
--                OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                OR nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                OR khoa_id = (SELECT public.fn_sys_actor_khoa_id()))));
--   DROP POLICY IF EXISTS "vst_obs_select_permission" ON public.gstt_fact_vst;
--   CREATE POLICY "vst_obs_select_permission" ON public.gstt_fact_vst
--     FOR SELECT TO authenticated USING (
--       (SELECT public.fn_sys_is_admin())
--       OR ((SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
--           AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
--           AND EXISTS (SELECT 1 FROM public.gstt_fact_vst_sessions s
--                        WHERE s.id = gstt_fact_vst.session_id
--                          AND COALESCE(s.is_active, true) = true
--                          AND ((SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
--                               OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                               OR s.nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                               OR s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())))));

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
        OR (
          (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
          AND (
            nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
            OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())
          )
        )
        OR (
          NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
          AND CASE
                WHEN (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
                  THEN khoa_id = (SELECT public.fn_sys_actor_khoa_id())
                WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK'))
                  THEN false
                ELSE true
              END
        )
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
             OR (
               (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
               AND (
                 s.nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
                 OR s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())
               )
             )
             OR (
               NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
               AND CASE
                     WHEN (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
                       THEN s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())
                     WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK'))
                       THEN false
                     ELSE true
                   END
             )
           )
      )
    )
  );

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước khi apply:
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('fn_sys_has_role','fn_sys_actor_nhan_su_id','fn_sys_actor_khoa_id');  -- phải đủ 3 (20261108100000 đã áp)
--   SELECT r.name, count(DISTINCT ur.user_id) AS so_user
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--    WHERE r.name IN ('CHU_NHIEM_KHOA','HOI_DONG_KSNK','MANG_LUOI_KSNK','NHAN_VIEN_KSNK','KHACH_THONG_KE_GSTT')
--    GROUP BY 1 ORDER BY 1;
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname = 'public' AND policyname IN ('vst_sessions_select_permission','vst_obs_select_permission');
