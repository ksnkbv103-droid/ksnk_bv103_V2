-- PO 2026-10-27: chỉ ADMIN (chủ nhiệm khoa) duyệt phiếu đề nghị danh mục.
-- App cập nhật phiếu qua admin client (bỏ qua RLS); policy UPDATE cho user client không còn cần quyền edit.
DROP POLICY IF EXISTS cssd_catalog_de_nghi_update ON public.cssd_catalog_de_nghi;
CREATE POLICY cssd_catalog_de_nghi_update ON public.cssd_catalog_de_nghi
  FOR UPDATE TO authenticated
  USING ((SELECT public.fn_sys_is_admin()))
  WITH CHECK ((SELECT public.fn_sys_is_admin()));
