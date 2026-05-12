-- Quản trị / MDM: bổ sung policy SELECT (và UPDATE chi tiết bộ khi cần) cho role authenticated
-- trên các bảng đã ENABLE RLS nhưng chưa có policy — trước đây chỉ đọc qua service role.
-- Cho phép createServerSupabaseUserClient() sau verifyPermission ở tầng app.

CREATE POLICY "dm_khoi_khoa_select_auth_v1" ON public.dm_khoi_khoa
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_khoa_phong_select_auth_v1" ON public.dm_khoa_phong
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_khu_vuc_giam_sat_select_auth_v1" ON public.dm_khu_vuc_giam_sat
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_nghe_nghiep_select_auth_v1" ON public.dm_nghe_nghiep
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_loai_dung_cu_select_auth_v1" ON public.dm_loai_dung_cu
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_to_cong_tac_select_auth_v1" ON public.dm_to_cong_tac
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_chuc_vu_select_auth_v1" ON public.dm_chuc_vu
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_chuc_danh_select_auth_v1" ON public.dm_chuc_danh
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mdm_nhan_su_select_auth_v1" ON public.mdm_nhan_su
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_bo_dung_cu_select_auth_v1" ON public.dm_bo_dung_cu
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dm_bo_dung_cu_chi_tiet_select_auth_v1" ON public.dm_bo_dung_cu_chi_tiet
  FOR SELECT TO authenticated USING (true);

-- Ghi chú issue trên chi tiết bộ (appendChiTietIssueNoteAction) sau gate DC_LE ở app
CREATE POLICY "dm_bo_dung_cu_chi_tiet_update_auth_v1" ON public.dm_bo_dung_cu_chi_tiet
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_mdm_nhan_su_list_order
  ON public.mdm_nhan_su (is_active DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mdm_nhan_su_nghe_nghiep_id
  ON public.mdm_nhan_su (nghe_nghiep_id)
  WHERE nghe_nghiep_id IS NOT NULL;
