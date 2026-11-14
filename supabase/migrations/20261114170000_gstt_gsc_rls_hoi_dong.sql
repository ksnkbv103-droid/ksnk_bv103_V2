-- VST-023 (Cao): HOI_DONG_KSNK («Hội đồng KSNK» ≈ BGĐ) không đọc phiên Giám sát chung (GSC) có danh tính; CHU_NHIEM_KHOA đọc toàn viện.
--
-- Mục đích:
--   Đặc tả M02_GIAM_SAT_TUAN_THU.md, ma trận quyền dòng «Phiên giám sát, lượt quan sát, kết quả tiêu chí»:
--   TK_KSNK «D (mở khóa/sửa muộn) X E», BGĐ «X (ẩn)», CN_KHOA «X (own, ẩn)», CB_KSNK «T S X»; R2.07 (danh tính
--   chỉ có ở bản ghi thô), R2.08 (báo cáo và xuất bỏ danh tính). Policy gsc_sessions_select_permission của
--   20261108100000 cho MỌI vai không phải MANG_LUOI_KSNK đọc toàn bộ phiên GSC — kể cả HOI_DONG_KSNK (vốn có
--   quyền GIAM_SAT_CHUNG:view) — kèm ten_nguoi_giam_sat, ten_nhan_vien, ten_nguoi_benh, ma_benh_an.
--   VST đã chặn ở VST-014/VST-015/VST-026 (20261114150000 để lại GSC cho VST-023); file này làm tương tự cho GSC.
--   CHU_NHIEM_KHOA («Chủ nhiệm khoa KSNK» ≡ TK_KSNK, M01_VE_SINH_TAY.md dòng 22) đọc toàn viện như VST-026,
--   kể cả khi kiêm MANG_LUOI_KSNK. Số liệu thống kê ẩn danh của HĐ vẫn đi qua RPC SECURITY DEFINER (không đụng).
--
-- Nhóm cuối mới (thứ tự ưu tiên):
--   * có NHAN_VIEN_KSNK hoặc CHU_NHIEM_KHOA (kể cả kèm HĐ/mạng lưới)  → toàn bộ phiên is_active
--   * không thuộc trên, có MANG_LUOI_KSNK                              → nguoi_giam_sat_id = mình OR khoa_id = khoa mình
--   * không thuộc trên, không MANG_LUOI, có HOI_DONG_KSNK              → 0 dòng
--   * còn lại (vai khác đã qua quyền view)                              → toàn bộ
--   Giữ nguyên: nhánh fn_sys_is_admin(), quyền GIAM_SAT_CHUNG:view, is_active, loại KHACH_THONG_KE_GSTT,
--   kiểu (SELECT public.fn_sys_...) bọc subselect (initplan). Khớp src/modules/giam-sat-chung/lib/gsc-read-scope.ts.
--
-- Ảnh hưởng sau khi áp:
--   * So với PROD (đang chạy policy của 20261108100000):
--       - THU HẸP: HOI_DONG_KSNK thuần (không kiêm NV KSNK/CNK/mạng lưới) mất khả năng đọc GSC có danh tính
--         qua PostgREST (từ toàn viện về 0 dòng). Đúng đặc tả; app đã chặn từ VST-023 (gsc-read-scope.ts).
--         Cần xem prod có ai giữ HOI_DONG_KSNK trước khi áp (truy vấn cuối file).
--       - MỞ RỘNG: MANG_LUOI_KSNK kiêm CHU_NHIEM_KHOA → toàn viện (trước: «phiên mình hoặc khoa mình»).
--       - Không đổi: ADMIN, NHAN_VIEN_KSNK, CHU_NHIEM_KHOA thuần, mạng lưới thuần, vai khác, khách thống kê.
--   * So với LOCAL hiện tại: cùng hai thay đổi trên (HĐ thuần và HĐ + vai không rộng → 0 dòng;
--     MANG_LUOI+CNK → toàn viện); còn lại không đổi.
--   * App đọc GSC bằng admin client (service_role) nên hành vi app do gsc-read-scope.ts quyết định; migration này là
--     lớp chặn đường PostgREST trực tiếp (authenticated, anon bị chặn bởi RLS) và các view security_invoker
--     v_gstt_giam_sat_chung_sessions_full. RPC thống kê SECURITY DEFINER, policy "Admin full access",
--     rpc_gsc_tgs_session_hits (INVOKER qua service_role) và hai policy VST: không đụng.
--
-- Phụ thuộc: helper của 20261108100000_gstt_session_read_scope_rls.sql
--   fn_sys_has_role(text), fn_sys_actor_nhan_su_id(), fn_sys_actor_khoa_id() (STABLE SECURITY DEFINER);
--   fn_sys_is_admin(), fn_sys_has_permission(text, text) có từ trước.
--
-- CẢNH BÁO CHẠY LẠI: 20261108100000 và file này đều DROP/CREATE cùng policy gsc_sessions_select_permission.
--   Chạy lại 20261108100000 đứng một mình sẽ hoàn tác bản sửa này → file này phải là file áp SAU CÙNG của cặp.
--   NEN-003: trên prod, MCP apply_migration ghi version theo giờ apply (không phải 20261114170000);
--   phải `supabase migration repair --status applied 20261114170000` trước khi dùng `db push`,
--   nếu không db push sẽ áp lại các file đã áp qua MCP (thứ tự version lệch giờ thực tế).
--
-- HOÀN TÁC (tạo lại policy với điều kiện của 20261108100000):
--   DROP POLICY IF EXISTS "gsc_sessions_select_permission" ON public.gstt_fact_chung_sessions;
--   CREATE POLICY "gsc_sessions_select_permission" ON public.gstt_fact_chung_sessions
--     FOR SELECT TO authenticated USING (
--       (SELECT public.fn_sys_is_admin())
--       OR ((SELECT public.fn_sys_has_permission('GIAM_SAT_CHUNG', 'view'))
--           AND COALESCE(is_active, true) = true
--           AND NOT (SELECT public.fn_sys_has_role('KHACH_THONG_KE_GSTT'))
--           AND ((SELECT public.fn_sys_has_role('NHAN_VIEN_KSNK'))
--                OR NOT (SELECT public.fn_sys_has_role('MANG_LUOI_KSNK'))
--                OR nguoi_giam_sat_id = (SELECT public.fn_sys_actor_nhan_su_id())
--                OR khoa_id = (SELECT public.fn_sys_actor_khoa_id()))));

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

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước khi apply:
--   SELECT proname FROM pg_proc
--    WHERE proname IN ('fn_sys_has_role','fn_sys_actor_nhan_su_id','fn_sys_actor_khoa_id');  -- phải đủ 3 (20261108100000 đã áp)
--   SELECT r.name, count(DISTINCT ur.user_id) AS so_user
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--    WHERE r.name IN ('CHU_NHIEM_KHOA','HOI_DONG_KSNK','MANG_LUOI_KSNK','NHAN_VIEN_KSNK','KHACH_THONG_KE_GSTT')
--    GROUP BY 1 ORDER BY 1;
--   -- Người đang giữ HOI_DONG_KSNK và toàn bộ vai của họ (HĐ thuần sẽ mất đọc GSC có danh tính qua PostgREST):
--   SELECT ur.user_id, string_agg(r.name, ', ' ORDER BY r.name) AS cac_vai
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--    WHERE ur.user_id IN (SELECT ur2.user_id FROM sys_user_roles ur2 JOIN sys_roles r2 ON r2.id = ur2.role_id
--                          WHERE r2.name = 'HOI_DONG_KSNK')
--    GROUP BY 1 ORDER BY 1;
--   SELECT policyname, cmd, qual FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'gstt_fact_chung_sessions';  -- chỉ 2 policy: «Admin full access» và gsc_sessions_select_permission
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    WHERE name ILIKE '%gstt_session_read_scope%' OR name ILIKE '%gsc_rls%' ORDER BY version;  -- NEN-003: đối chiếu version
