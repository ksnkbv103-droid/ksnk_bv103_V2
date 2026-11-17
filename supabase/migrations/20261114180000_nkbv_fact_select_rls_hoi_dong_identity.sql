-- NKBV-035 (Cao): HOI_DONG_KSNK («Hội đồng KSNK» ≈ BGĐ) không đọc dữ liệu danh tính của sáu bảng nkbv_fact_* qua PostgREST.
--
-- Mục đích:
--   Đặc tả M03_GIAM_SAT_NKBV.md dòng 13 («Xa» = chỉ xem dữ liệu ẩn danh, mã giả hóa) và ma trận quyền dòng 19–25, cột
--   BGD = «Xa» ở mọi đối tượng có danh tính. HĐ ≈ BGĐ là GIẢ ĐỊNH chờ PO (M03 chưa có cột riêng cho Hội đồng).
--   NKBV-032/NKBV-034 đã chặn ở tầng ứng dụng (src/modules/giam-sat-nkbv/lib/nkbv-khoa-scope.ts: isNkbvHoiDongOnly →
--   identityDenied, cổng ở năm action đọc có danh tính). Nhưng mọi người dùng đăng nhập chung DB role authenticated có
--   SELECT mức bảng trên mọi cột, còn policy *_select của 20261111170000 chỉ thu hẹp MANG_LUOI_KSNK theo khoa, không loại
--   HOI_DONG_KSNK (vốn có GIAM_SAT_NKBV:view) → HĐ thuần gọi thẳng PostgREST vẫn đọc đủ dòng kèm ho_ten_benh_nhan,
--   ma_benh_nhan, ngay_sinh (nkbv_fact_benh_an, nkbv_fact_su_kien, nkbv_fact_vi_sinh) hoặc họ tên/mã bệnh nhân
--   (nkbv_fact_mau_so_phau_thuat, nkbv_fact_device_registry, nkbv_fact_labid_event).
--   Quyền theo cột không dùng được (chung một DB role); viết lại USING sáu policy dễ lệch văn bản giữa prod và local.
--   File này thêm MỘT policy RESTRICTIVE FOR SELECT cho mỗi bảng (RESTRICTIVE được AND với các policy PERMISSIVE hiện có,
--   nên không đụng USING của 20261111170000) và MỘT hàm trợ giúp.
--
-- Quy tắc (khớp isNkbvHoiDongOnly): bị chặn đọc khi thỏa CẢ NĂM điều kiện
--   có HOI_DONG_KSNK
--   VÀ không có CHU_NHIEM_KHOA   (≡ TK_KSNK «X*», xem 20261114170000)
--   VÀ không phải ADMIN
--   VÀ không có NHAN_VIEN_KSNK   (≡ CB_KSNK «X*»)
--   VÀ không có MANG_LUOI_KSNK   (khoảng hở có sẵn, xem dưới)
-- Vai/tổ hợp khác: không đổi (các policy PERMISSIVE hiện có vẫn quyết định).
--
-- Khoảng hở/lệch có sẵn, cố ý KHÔNG đóng ở file này (cổng PO):
--   * MANG_LUOI_KSNK kiêm HOI_DONG_KSNK: fn_nkbv_actor_khoa_restricted() loại HĐ nên đọc toàn viện kèm danh tính
--     (tầng ứng dụng cũng cho qua).
--   * HOI_DONG_KSNK kiêm CHU_NHIEM_KHOA: đọc toàn viện (CNK ≡ TK_KSNK «X*»), giống VST-026 và VST-023
--     (tầng ứng dụng cũng cho qua).
--   * Break-glass: email trong env KSNK_BREAK_GLASS_EMAILS được ứng dụng coi là ADMIN (withBreakGlassAdminRole,
--     src/lib/auth/trusted-admin-email.ts), còn fn_sys_is_admin() ở DB chỉ xét sys_user_roles. Người break-glass chỉ giữ
--     HOI_DONG_KSNK trong DB sẽ thấy 0 dòng ở các truy vấn bằng client người dùng dù ứng dụng coi là ADMIN (lệch theo
--     hướng chặn, không lộ dữ liệu). Cần đọc thì gán vai ADMIN thật trong sys_user_roles.
--   * fn_nkbv_actor_khoa_ma_benh_an_set() (SECURITY DEFINER, từ 20261111170000, authenticated gọi được, không kiểm HĐ) trả
--     ma_benh_an của khoa người gọi, không kèm họ tên/mã bệnh nhân/ngày sinh: HĐ có khoa vẫn lấy được mã bệnh án qua hàm
--     này và qua ba bảng nkbv_fact_ba_*. Muốn che mã bệnh án thì sửa cùng lúc hàm và ba bảng (xem «KHÔNG đưa vào file này»).
--
-- Thiết kế:
--   * fn_nkbv_actor_identity_denied() là SECURITY INVOKER (KHÔNG thêm hàm SECURITY DEFINER mới nên acl-snapshot không
--     đổi): chỉ gọi fn_sys_has_role/fn_sys_is_admin vốn đã cấp EXECUTE cho authenticated. search_path cố định có pg_temp.
--   * Policy bọc (SELECT ...) để Postgres tính một lần mỗi câu lệnh (initplan), không tính theo từng dòng.
--   * Chạy lại 20261111170000 chỉ DROP/CREATE policy *_select của nó, KHÔNG gỡ policy *_select_hoi_dong_deny của file này.
--
-- Ảnh hưởng sau khi áp (đo ở DB local 2026-11-14, dữ liệu seed; prod chưa đo — NEN-003):
--   * THU HẸP: người chỉ có HOI_DONG_KSNK, hoặc HĐ kèm vai nằm ngoài bốn vai ngoại trừ (ví dụ trong probe: HĐ +
--     TO_TRUONG_CSSD_TEST), đọc sáu bảng về 0 dòng. Seed local hiện chưa có tài khoản nào giữ HOI_DONG_KSNK. Số dòng seed
--     local trước khi áp: benh_an 85, vi_sinh 99, mau_so_phau_thuat 3, su_kien 2, device_registry 0, labid_event 0 (probe
--     chèn dòng mẫu trong transaction rồi ROLLBACK). Đúng với tầng ứng dụng NKBV-034 (cùng điều kiện). Vẫn đọc được số liệu
--     thống kê ẩn danh qua admin client.
--   * GHI: policy chỉ áp FOR SELECT, nhưng PostgreSQL cũng áp policy SELECT khi UPDATE/DELETE có WHERE tham chiếu cột (ra 0
--     dòng) và khi INSERT/UPDATE ... RETURNING (lỗi RLS hoặc 0 dòng). Chỉ chạm người thuộc diện bị chặn mà vẫn có quyền ghi
--     NKBV (HĐ + vai như TO_TRUONG_CSSD_TEST, có create/edit/delete/import); HĐ thuần chỉ có view. Trên nkbv_fact_su_kien
--     role authenticated chỉ có SELECT (đo local) nên ghi không đi qua client người dùng.
--   * KHÔNG ĐỔI: ADMIN, NHAN_VIEN_KSNK, MANG_LUOI_KSNK (theo khoa như cũ; kiêm HĐ vẫn toàn viện như cũ), CHU_NHIEM_KHOA
--     kiêm HĐ (toàn viện như cũ), mọi vai không có HOI_DONG_KSNK, anon (policy chỉ áp TO authenticated).
--   * service_role/postgres bỏ qua RLS nên các action dùng admin client giữ nguyên, do cổng ứng dụng quyết định
--     (NKBV-039 fetchNkbvCasesLinkedToCssd, NKBV-040 listNkbvViSinhStore còn mở trong sổ lỗi). fn_nkbv_ba_hub và
--     fn_nkbv_dich_te_hoc_rates là INVOKER nên chịu policy mới; rpc_nkbv_tham_dinh_ca là DEFINER nhưng chỉ service_role
--     gọi được. View v_nkbv_su_kien_full, v_nkbv_vi_sinh_chua_phan_tich, fact_nkbv_device_registry đều
--     security_invoker=true nên chịu policy mới qua bảng nền.
--   * KHÔNG đưa vào file này: nkbv_fact_ba_ngay_khoa, nkbv_fact_ba_ngay_dung_cu, nkbv_fact_ba_timeline và view
--     nkbv_v_ba_dung_cu_dat_rut (chỉ có ma_benh_an, không họ tên/mã bệnh nhân), nkbv_fact_ba_phan_tich và
--     nkbv_fact_mau_so_daily (đo local: không có khóa danh tính trong jsonb). Mức thấp hơn; nếu PO muốn che cả mã bệnh án
--     thì thêm policy cùng mẫu.
--
-- Phụ thuộc: fn_sys_has_role(text) của 20261108100000_gstt_session_read_scope_rls.sql (STABLE SECURITY DEFINER) và
--   fn_sys_is_admin() có từ trước. Không phụ thuộc cứng vào 20261111170000; nên áp sau nó.
--
-- CẢNH BÁO CHẠY LẠI: file này idempotent (CREATE OR REPLACE FUNCTION; DROP POLICY IF EXISTS rồi CREATE POLICY).
--   NEN-003: trên prod, MCP apply_migration ghi version theo giờ apply (không phải 20261114180000);
--   phải `supabase migration repair --status applied 20261114180000` trước khi dùng `db push`,
--   nếu không db push sẽ áp lại các file đã áp qua MCP (thứ tự version lệch giờ thực tế).
--
-- HOÀN TÁC (gỡ lớp chặn, về hành vi trước file này):
--   DROP POLICY IF EXISTS nkbv_fact_benh_an_select_hoi_dong_deny ON public.nkbv_fact_benh_an;
--   DROP POLICY IF EXISTS nkbv_fact_device_registry_select_hoi_dong_deny ON public.nkbv_fact_device_registry;
--   DROP POLICY IF EXISTS nkbv_fact_labid_event_select_hoi_dong_deny ON public.nkbv_fact_labid_event;
--   DROP POLICY IF EXISTS nkbv_fact_mau_so_phau_thuat_select_hoi_dong_deny ON public.nkbv_fact_mau_so_phau_thuat;
--   DROP POLICY IF EXISTS nkbv_fact_su_kien_select_hoi_dong_deny ON public.nkbv_fact_su_kien;
--   DROP POLICY IF EXISTS nkbv_fact_vi_sinh_select_hoi_dong_deny ON public.nkbv_fact_vi_sinh;
--   DROP FUNCTION IF EXISTS public.fn_nkbv_actor_identity_denied();

-- === hàm trợ giúp ===
CREATE OR REPLACE FUNCTION public.fn_nkbv_actor_identity_denied()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.fn_sys_has_role('HOI_DONG_KSNK')
     AND NOT public.fn_sys_has_role('CHU_NHIEM_KHOA')
     AND NOT public.fn_sys_is_admin()
     AND NOT public.fn_sys_has_role('NHAN_VIEN_KSNK')
     AND NOT public.fn_sys_has_role('MANG_LUOI_KSNK');
$$;

COMMENT ON FUNCTION public.fn_nkbv_actor_identity_denied() IS
  'NKBV-035: true khi người đăng nhập chỉ là HOI_DONG_KSNK (không kiêm CHU_NHIEM_KHOA, ADMIN, NHAN_VIEN_KSNK, MANG_LUOI_KSNK); dùng trong policy RESTRICTIVE *_select_hoi_dong_deny của sáu bảng nkbv_fact_*.';

REVOKE ALL ON FUNCTION public.fn_nkbv_actor_identity_denied() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_nkbv_actor_identity_denied() TO authenticated, service_role;

-- === nkbv_fact_benh_an ===
DROP POLICY IF EXISTS nkbv_fact_benh_an_select_hoi_dong_deny ON public.nkbv_fact_benh_an;
CREATE POLICY nkbv_fact_benh_an_select_hoi_dong_deny
  ON public.nkbv_fact_benh_an
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- === nkbv_fact_device_registry ===
DROP POLICY IF EXISTS nkbv_fact_device_registry_select_hoi_dong_deny ON public.nkbv_fact_device_registry;
CREATE POLICY nkbv_fact_device_registry_select_hoi_dong_deny
  ON public.nkbv_fact_device_registry
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- === nkbv_fact_labid_event ===
DROP POLICY IF EXISTS nkbv_fact_labid_event_select_hoi_dong_deny ON public.nkbv_fact_labid_event;
CREATE POLICY nkbv_fact_labid_event_select_hoi_dong_deny
  ON public.nkbv_fact_labid_event
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- === nkbv_fact_mau_so_phau_thuat ===
DROP POLICY IF EXISTS nkbv_fact_mau_so_phau_thuat_select_hoi_dong_deny ON public.nkbv_fact_mau_so_phau_thuat;
CREATE POLICY nkbv_fact_mau_so_phau_thuat_select_hoi_dong_deny
  ON public.nkbv_fact_mau_so_phau_thuat
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- === nkbv_fact_su_kien ===
DROP POLICY IF EXISTS nkbv_fact_su_kien_select_hoi_dong_deny ON public.nkbv_fact_su_kien;
CREATE POLICY nkbv_fact_su_kien_select_hoi_dong_deny
  ON public.nkbv_fact_su_kien
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- === nkbv_fact_vi_sinh ===
DROP POLICY IF EXISTS nkbv_fact_vi_sinh_select_hoi_dong_deny ON public.nkbv_fact_vi_sinh;
CREATE POLICY nkbv_fact_vi_sinh_select_hoi_dong_deny
  ON public.nkbv_fact_vi_sinh
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (NOT (SELECT public.fn_nkbv_actor_identity_denied()));

-- CHƯA APPLY PROD — chờ PO.
-- Kiểm prod (chỉ đọc), trước khi apply:
--   SELECT proname FROM pg_proc
--    WHERE pronamespace = 'public'::regnamespace AND proname IN ('fn_sys_has_role','fn_sys_is_admin');  -- phải đủ 2 (fn_sys_has_role do 20261108100000 tạo; sổ lỗi ghi lệch có/không có trên prod, chưa đo: thiếu thì áp 20261108100000 trước, xem VST-025)
--   SELECT to_regclass('public.nkbv_fact_benh_an'), to_regclass('public.nkbv_fact_device_registry'),
--          to_regclass('public.nkbv_fact_labid_event'), to_regclass('public.nkbv_fact_mau_so_phau_thuat'),
--          to_regclass('public.nkbv_fact_su_kien'), to_regclass('public.nkbv_fact_vi_sinh');  -- không được NULL (device_registry và labid_event từng bị DROP TABLE bởi 20260827044050_nkbv_ba_ngay_khoa_dung_cu.sql rồi restore bởi 20260901010000_nkbv_restore_device_labid.sql; trên prod hai bảng này có thể vắng, nếu NULL thì dừng, không áp)
--   SELECT tablename, policyname, permissive, cmd FROM pg_policies
--    WHERE schemaname = 'public' AND tablename IN ('nkbv_fact_benh_an','nkbv_fact_device_registry','nkbv_fact_labid_event',
--          'nkbv_fact_mau_so_phau_thuat','nkbv_fact_su_kien','nkbv_fact_vi_sinh')
--    ORDER BY 1, 2;  -- mỗi bảng 4 policy PERMISSIVE *_select/_insert/_update/_delete; chưa có *_select_hoi_dong_deny
--   SELECT r.name, count(DISTINCT ur.user_id) AS so_user
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--    WHERE r.name IN ('HOI_DONG_KSNK','CHU_NHIEM_KHOA','MANG_LUOI_KSNK','NHAN_VIEN_KSNK')
--    GROUP BY 1 ORDER BY 1;
--   -- Người đang giữ HOI_DONG_KSNK và toàn bộ vai của họ (HĐ thuần, và HĐ kèm vai ngoài bốn vai ngoại trừ, sẽ mất đọc):
--   SELECT ur.user_id, string_agg(r.name, ', ' ORDER BY r.name) AS cac_vai
--     FROM sys_user_roles ur JOIN sys_roles r ON r.id = ur.role_id
--    WHERE ur.user_id IN (SELECT ur2.user_id FROM sys_user_roles ur2 JOIN sys_roles r2 ON r2.id = ur2.role_id
--                          WHERE r2.name = 'HOI_DONG_KSNK')
--    GROUP BY 1 ORDER BY 1;
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    WHERE name ILIKE '%nkbv_fact_select_rls%' OR name ILIKE '%gstt_session_read_scope%' ORDER BY version;  -- NEN-003: đối chiếu version
