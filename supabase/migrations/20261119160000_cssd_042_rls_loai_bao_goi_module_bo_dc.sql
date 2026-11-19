-- ADR: docs/adr/20261119-cssd-042-rls-loai-bao-goi-module-bo-dc.md
-- CSSD-042: hai policy của public.cssd_dm_loai_bao_goi (20261005145000_cssd_me05_hsd_bao_goi.sql:58-69) kiểm
-- fn_sys_has_permission('CSSD', ...) nhưng sys_permissions không có module_name = 'CSSD' => chỉ ADMIN qua được.
-- App kiểm danh mục loại bao gói bằng module BO_DC (bo-dung-cu.actions.ts verifyPermission("BO_DC","view")),
-- nên đổi policy sang BO_DC: đọc = BO_DC:view, ghi = BO_DC:edit. Giữ tên policy, TO authenticated; không đổi GRANT,
-- bảng, cột, dữ liệu. Dạng initplan (SELECT ...) như 20261119150000_vst_028_vai_lanh_dao_khoa.sql.
-- Hoàn tác: DROP hai policy rồi CREATE lại như 20261005145000 (fn_sys_has_permission('CSSD','view') / ('CSSD','edit')).

DROP POLICY IF EXISTS cssd_dm_loai_bao_goi_select ON public.cssd_dm_loai_bao_goi;
CREATE POLICY cssd_dm_loai_bao_goi_select
  ON public.cssd_dm_loai_bao_goi
  FOR SELECT TO authenticated
  USING ((SELECT public.fn_sys_has_permission('BO_DC'::text, 'view'::text)));

DROP POLICY IF EXISTS cssd_dm_loai_bao_goi_write ON public.cssd_dm_loai_bao_goi;
CREATE POLICY cssd_dm_loai_bao_goi_write
  ON public.cssd_dm_loai_bao_goi
  FOR ALL TO authenticated
  USING ((SELECT public.fn_sys_has_permission('BO_DC'::text, 'edit'::text)))
  WITH CHECK ((SELECT public.fn_sys_has_permission('BO_DC'::text, 'edit'::text)));

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc):
--   SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'cssd_dm_loai_bao_goi';
--   SELECT r.name, p.action FROM sys_permissions p JOIN sys_role_permissions rp ON rp.permission_id = p.id
--     JOIN sys_roles r ON r.id = rp.role_id WHERE p.module_name = 'BO_DC' ORDER BY 1, 2;
