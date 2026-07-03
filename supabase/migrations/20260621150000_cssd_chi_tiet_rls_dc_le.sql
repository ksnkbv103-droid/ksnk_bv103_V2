-- Đồng bộ RLS chi tiết bộ: app permission DC_LE (không BO_DC).

DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_delete ON public.cssd_dm_bo_dung_cu_chi_tiet;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_insert ON public.cssd_dm_bo_dung_cu_chi_tiet;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_select ON public.cssd_dm_bo_dung_cu_chi_tiet;
DROP POLICY IF EXISTS cssd_dm_bo_dung_cu_chi_tiet_update ON public.cssd_dm_bo_dung_cu_chi_tiet;

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_select ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('DC_LE', 'view'));

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_insert ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_has_permission('DC_LE', 'create'));

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_update ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR UPDATE TO authenticated
  USING (public.fn_sys_has_permission('DC_LE', 'edit'))
  WITH CHECK (public.fn_sys_has_permission('DC_LE', 'edit'));

CREATE POLICY cssd_dm_bo_dung_cu_chi_tiet_delete ON public.cssd_dm_bo_dung_cu_chi_tiet
  FOR DELETE TO authenticated
  USING (public.fn_sys_has_permission('DC_LE', 'delete'));

COMMENT ON TABLE public.cssd_dm_bo_dung_cu_chi_tiet IS
  'Thành phần trong bộ / dụng cụ lẻ — quyền app DC_LE; ma_chi_tiet (DC-*) khác ma_bo (B01.SET.NN).';
