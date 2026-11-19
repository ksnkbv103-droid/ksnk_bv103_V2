-- ADR: docs/adr/20261119-vst-028-vai-lanh-dao-khoa.md
-- VST-028: vai LANH_DAO_KHOA (ĐDT + chủ nhiệm khoa lâm sàng, dùng chung) đọc phiên/quan sát VST có danh tính
-- của ĐÚNG khoa mình (R1.34). Chỉ quyền GIAM_SAT_VST:view. KHÔNG gán vai cho tài khoản nào (cổng PO).
--
-- Thay đổi so với 20261114160000 (áp cho CẢ HAI policy):
--   + nhánh mới: LANH_DAO_KHOA AND khoa_id = fn_sys_actor_khoa_id()  (khoa NULL ⇒ không khớp ⇒ 0 dòng)
--   + nhánh «còn lại» (vai khác có view → toàn viện) thêm AND NOT LANH_DAO_KHOA, để LĐK chỉ đi qua nhánh khoa.
--   Giữ nguyên: ADMIN, quyền view, is_active, loại KHACH_THONG_KE_GSTT, NV KSNK/CNK toàn viện, mạng lưới, HĐ thuần 0 dòng,
--   kiểu (SELECT public.fn_sys_...) (initplan). Không đổi GRANT bảng, không đụng RPC thống kê.
--
-- CẢNH BÁO CHẠY LẠI: 20261108100000, 20261114150000, 20261114160000 và file này đều DROP/CREATE cùng hai policy.
--   File này phải là file áp SAU CÙNG lên hai policy. NEN-003: trên prod MCP apply_migration ghi version theo giờ apply;
--   phải `supabase migration repair --status applied 20261119150000` trước khi dùng `db push`.
-- Chỉ thêm dữ liệu + tạo lại policy; chạy lại an toàn. Không BEGIN/COMMIT: db push tự bọc transaction.

INSERT INTO public.sys_roles (name, description, is_active)
VALUES ('LANH_DAO_KHOA', 'Lãnh đạo khoa lâm sàng (ĐDT/CN khoa) — xem phiên Vệ sinh tay có danh tính của khoa mình', true)
ON CONFLICT (name) DO NOTHING;

-- sys_permissions ('GIAM_SAT_VST','view') đã có (dùng từ 20260703100000_gstt_rls_hardening.sql).
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.sys_roles r
  JOIN public.sys_permissions p ON p.module_name = 'GIAM_SAT_VST' AND p.action = 'view'
 WHERE r.name = 'LANH_DAO_KHOA'
ON CONFLICT (role_id, permission_id) DO NOTHING;

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
          (SELECT public.fn_sys_has_role('LANH_DAO_KHOA'))
          AND khoa_id = (SELECT public.fn_sys_actor_khoa_id())
        )
        OR (
          NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
          AND NOT (SELECT public.fn_sys_has_role('LANH_DAO_KHOA'))
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
               (SELECT public.fn_sys_has_role('LANH_DAO_KHOA'))
               AND s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())
             )
             OR (
               NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
               AND NOT (SELECT public.fn_sys_has_role('LANH_DAO_KHOA'))
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

-- Kiểm sau apply:
--   SELECT count(*) FROM public.sys_roles WHERE name = 'LANH_DAO_KHOA';                    -- 1
--   SELECT p.module_name, p.action FROM public.sys_role_permissions rp
--     JOIN public.sys_roles r ON r.id = rp.role_id JOIN public.sys_permissions p ON p.id = rp.permission_id
--    WHERE r.name = 'LANH_DAO_KHOA';                                                       -- đúng 1 dòng GIAM_SAT_VST|view
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname = 'public' AND policyname IN ('vst_sessions_select_permission','vst_obs_select_permission');
--      -- qual phải chứa 'LANH_DAO_KHOA' (2 lần mỗi policy)
--
-- HOÀN TÁC (policy về nguyên văn 20261114160000 dòng 81–151; xóa vai chỉ khi chưa gán cho ai):
--   DROP POLICY IF EXISTS "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions;
--   CREATE POLICY "vst_sessions_select_permission" ON public.gstt_fact_vst_sessions
--     FOR SELECT TO authenticated USING (
--       (SELECT public.fn_sys_is_admin())
--       OR ((SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view'))
--           AND COALESCE(is_active, true) = true
--           AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
--           AND ((SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
--                OR (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
--                OR ((SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                    AND (nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                         OR khoa_id = (SELECT public.fn_sys_actor_khoa_id())))
--                OR (NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                    AND CASE WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK')) THEN false ELSE true END))));
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
--                               OR (SELECT public.fn_sys_has_role('CHU_NHIEM_KHOA'))
--                               OR ((SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                                   AND (s.nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                                        OR s.khoa_id = (SELECT public.fn_sys_actor_khoa_id())))
--                               OR (NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                                   AND CASE WHEN (SELECT public.fn_sys_has_role('HOI_DONG_KSNK')) THEN false ELSE true END)))));
--   DELETE FROM public.sys_role_permissions
--    WHERE role_id = (SELECT id FROM public.sys_roles WHERE name = 'LANH_DAO_KHOA');
--   DELETE FROM public.sys_roles WHERE name = 'LANH_DAO_KHOA'
--      AND NOT EXISTS (SELECT 1 FROM public.sys_user_roles ur JOIN public.sys_roles r ON r.id = ur.role_id
--                       WHERE r.name = 'LANH_DAO_KHOA');

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước khi apply:
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('fn_sys_has_role','fn_sys_actor_nhan_su_id','fn_sys_actor_khoa_id');   -- đủ 3
--   SELECT id FROM public.sys_permissions WHERE module_name = 'GIAM_SAT_VST' AND action = 'view';   -- 1 dòng
--   SELECT count(*) FROM public.sys_roles WHERE name = 'LANH_DAO_KHOA';                         -- 0 trước apply
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE schemaname = 'public' AND policyname IN ('vst_sessions_select_permission','vst_obs_select_permission');
--      -- qual phải trùng bản 20261114160000 (có CHU_NHIEM_KHOA toàn viện, chưa có LANH_DAO_KHOA)
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    WHERE name ILIKE '%gstt_vst_rls%' OR name ILIKE '%session_read_scope%' OR name ILIKE '%lanh_dao_khoa%'
--    ORDER BY version;   -- NEN-003: đối chiếu version
