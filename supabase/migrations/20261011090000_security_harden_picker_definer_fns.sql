-- SEC-2026-10-11: siết quyền theo Supabase security advisor (prod 2026-10-11).
-- ĐÃ APPLY PROD 2026-10-11 qua MCP `apply_migration` (PO duyệt). Version trên prod do MCP đặt, khác tên file — không đổi tên file.
-- Kiểm sau apply (prod): picker chỉ còn SELECT; 14 hàm 0/14 authenticated; service_role giữ EXECUTE; hàm RLS + 2 RPC GSC vẫn cho authenticated.
--
-- Gốc chung: baseline `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES/FUNCTIONS TO anon, authenticated`
-- cấp quyền thừa cho mọi object tạo sau; nhiều migration chỉ `REVOKE … FROM PUBLIC, anon` nên sót `authenticated`.
--
-- 1) v_mdm_nhan_su_picker (CRITICAL): view cố ý security_invoker=false (picker id/mã/tên/khoa, 20260908235742)
--    nhưng `authenticated` còn INSERT/UPDATE/DELETE. View 1 bảng → tự cập nhật được → ghi xuyên vào
--    mdm_nhan_su với quyền chủ view, BỎ QUA RLS (mọi tài khoản đăng nhập, kể cả khách, sửa/xóa được hồ sơ).
--    Sửa: chỉ còn SELECT như thiết kế. App không dùng view này (grep src) — không ảnh hưởng chức năng.
--
-- 2) 14 hàm SECURITY DEFINER không cần cho client gọi trực tiếp: app gọi qua admin client (service_role)
--    hoặc chỉ được gọi bên trong hàm DEFINER khác (chạy quyền chủ hàm — không cần EXECUTE của authenticated).
--    Kiểm trước: không policy/view nào tham chiếu; không có lời gọi .rpc() phía trình duyệt.
--    GIỮ cho authenticated (RLS cần): fn_sys_has_permission, fn_sys_is_admin, is_admin_user, fn_qlcv_can_read_fact;
--    và rpc_gsc_checklist_detail, rpc_gsc_compare_matrices (gsc-checklist-detail.actions dùng client người dùng, có guard trong hàm).
--
-- 3) search_path cố định cho 3 hàm plpgsql. KHÔNG đổi 4 hàm SQL (fn_nkbv_major_type_from_classification,
--    fn_cssd_cycle_used_clinically, fn_gsc_resolve_criterion_id, fn_gsc_resolve_criterion_label): mọi bảng đã
--    ghi `public.`, hàm dựng sẵn luôn tìm ở pg_catalog trước → không thể bị thay thế; thêm SET sẽ tắt inline
--    trong view phân tích GSC. Extension `unaccent` ở public: giữ (chuyển schema làm vỡ lời gọi không qualify).
--
-- Kiểm sau apply:
--   SELECT privilege_type FROM information_schema.role_table_grants
--    WHERE table_name='v_mdm_nhan_su_picker' AND grantee='authenticated';      -- chỉ SELECT
--   SELECT has_function_privilege('authenticated','public.rpc_assign_staff_ksnk_role(uuid,text)','EXECUTE'); -- f

BEGIN;

-- 1) Picker: chỉ đọc
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.v_mdm_nhan_su_picker FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.v_mdm_nhan_su_picker TO authenticated, service_role;

-- 2) Hàm DEFINER chỉ cho service_role (mọi overload theo tên)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        'fn_admin_module_stats',
        'fn_qlcv_actor_is_ksnk',
        'fn_require_cssd_workflow_edit',
        'fn_require_gstt_analytics_access',
        'rpc_assign_staff_ksnk_role',
        'rpc_cssd_apply_instrument_ledger',
        'rpc_cssd_apply_instrument_lines',
        'rpc_cssd_assign_cycle_qr',
        'rpc_cssd_commit_instrument_report',
        'rpc_cssd_persist_bom_checkpoint',
        'rpc_scan_workflow_station',
        'rpc_dashboard_gsc_strategic_analytics',
        'rpc_dashboard_vst_strategic_analytics',
        'rpc_vst_compare_matrices'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 3) search_path cố định (plpgsql)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY (ARRAY[
        'fn_cssd_me_bi_bm02_hop_le',
        'fn_gsc_expand_session_results_for_tc',
        'fn_sys_admin_audit_immutable'
      ])
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

COMMIT;
