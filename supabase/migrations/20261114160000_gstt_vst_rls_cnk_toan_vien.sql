-- VST-026 (Cao): CHU_NHIEM_KHOA («Chủ nhiệm khoa KSNK» ≡ TK_KSNK) đọc phiên/quan sát Vệ sinh tay toàn viện.
--
-- Mục đích:
--   20261114150000 (VST-015) hiểu nhầm CHU_NHIEM_KHOA là chủ nhiệm khoa lâm sàng nên giới hạn
--   CNK vào khoa_id của mình (khoa NULL ⇒ 0 dòng). Thực tế vai này là «Chủ nhiệm khoa KSNK —
--   duyệt chuyên môn, giám sát thay đổi danh mục» (20261111150000_ar1_chu_nhiem_khoa_role_catalog_approve.sql
--   dòng 10; docs/core/handover-roadmap.md dòng 80, PO duyệt 2026-11-10), tương ứng TK_KSNK của đặc tả
--   M01_VE_SINH_TAY.md dòng 22 (đọc phiên quan sát «D (xác nhận khóa), X, E», không giới hạn khoa).
--   HOI_DONG_KSNK thuần vẫn 0 dòng (R1.34: chỉ thấy số liệu ẩn danh qua RPC thống kê).
--
-- Nhóm cuối mới (áp cho CẢ HAI policy; thứ tự ưu tiên):
--   * có NHAN_VIEN_KSNK hoặc CHU_NHIEM_KHOA (kể cả kèm HĐ/mạng lưới, kể cả chưa gán khoa) → toàn bộ phiên is_active
--   * không thuộc trên, có MANG_LUOI_KSNK              → nguoi_giam_sat_id = mình OR khoa_id = khoa mình
--   * không thuộc trên, không MANG_LUOI, có HOI_DONG_KSNK → 0 dòng
--   * còn lại (vai khác đã qua quyền view)              → toàn bộ
--   Giữ nguyên: nhánh fn_sys_is_admin(), quyền GIAM_SAT_VST:view, is_active, loại KHACH_THONG_KE_GSTT,
--   kiểu (SELECT public.fn_sys_...) bọc subselect (initplan).
--
-- Ảnh hưởng sau khi áp:
--   * So với PROD: prod đang chạy policy của 20261108100000 (mọi vai không phải mạng lưới, gồm CNK, đọc
--     toàn bộ). 20261114150000 mới chỉ áp ở local (chưa push/apply prod). Migration này giữ CNK = toàn viện
--     và KHÔNG thu hẹp quyền của người dùng thật nào so với prod (khác prod duy nhất: HĐ thuần → 0 dòng,
--     và MANG_LUOI+CNK được mở rộng thành toàn viện — cả hai đến từ VST-015/VST-026).
--   * So với LOCAL hiện tại (150000): CNK, CNK+HĐ, MANG_LUOI+CNK, CNK chưa gán khoa được mở rộng thành
--     toàn viện. NV KSNK, mạng lưới thuần, HĐ thuần, ADMIN, khách thống kê, vai khác: không đổi.
--   * App đọc VST bằng admin client (service_role) nên hành vi app không đổi; đây là lớp chặn đường
--     PostgREST trực tiếp và hai view security_invoker v_gstt_giam_sat_vst_sessions_full,
--     v_gstt_giam_sat_vst_full. RPC thống kê SECURITY DEFINER, policy "Admin full access", policy GSC: không đụng.
--
-- Phụ thuộc: helper của 20261108100000_gstt_session_read_scope_rls.sql
--   fn_sys_has_role(text), fn_sys_actor_nhan_su_id(), fn_sys_actor_khoa_id() (STABLE SECURITY DEFINER).
--
-- CẢNH BÁO CHẠY LẠI: 20261108100000, 20261114150000 và file này đều DROP/CREATE cùng hai policy.
--   Chạy lại một file cũ đứng một mình sẽ hoàn tác bản sửa này → file này phải là file áp SAU CÙNG.
--   NEN-003: trên prod, MCP apply_migration ghi version theo giờ apply (không phải 20261114160000);
--   phải `supabase migration repair --status applied 20261114160000` trước khi dùng `db push`,
--   nếu không db push sẽ áp lại các file đã áp qua MCP (thứ tự version lệch giờ thực tế).
--
-- HOÀN TÁC (tạo lại hai policy với điều kiện của 20261114150000):
--   DROP POLICY IF EXISTS "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions;
--   CREATE POLICY "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions
--     FOR SELECT TO authenticated USING (
--       (SELECT public.fn_sys_is_admin())
--       OR ((SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
--           AND COALESCE(is_active, true) = true
--           AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
--           AND ((SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
--                OR ((SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                    AND (nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                         OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())))
--                OR (NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                    AND CASE
--                          WHEN (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
--                            THEN khoa_id = (SELECT public.fn_sys_actor_khoa_id())
--                          WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK'))
--                            THEN false
--                          ELSE true
--                        END))));
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
--                               OR ((SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                                   AND (s.nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                                        OR s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())))
--                               OR (NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                                   AND CASE
--                                         WHEN (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
--                                           THEN s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())
--                                         WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK'))
--                                           THEN false
--                                         ELSE true
--                                       END)))));

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
        OR (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
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
             OR (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
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
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    WHERE name ILIKE '%gstt_vst_rls%' OR name ILIKE '%session_read_scope%' ORDER BY version;  -- NEN-003: đối chiếu version
