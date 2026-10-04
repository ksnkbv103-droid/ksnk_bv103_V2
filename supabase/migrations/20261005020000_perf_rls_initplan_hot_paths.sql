-- PERF-1: bọc (select auth.uid()) / (select fn()) trên policy hot-path còn gọi hàm mỗi dòng.
-- File tạo để review; KHÔNG apply trong lát này (PO chạy migrate khi sẵn sàng).

-- 1) mdm_nhan_su — SELECT self (mọi form giám sát / actor resolve)
DROP POLICY IF EXISTS mdm_nhan_su_select_self ON public.mdm_nhan_su;
CREATE POLICY mdm_nhan_su_select_self
  ON public.mdm_nhan_su
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id IS NOT NULL
    AND auth_user_id = (select auth.uid())
  );

-- 2) Đào tạo — lan_thi / lan_thi_cau (auth.uid() bare → initplan)
DROP POLICY IF EXISTS dao_tao_lan_thi_select ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_select ON public.dao_tao_lan_thi
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user((select auth.uid()))
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR auth_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_insert ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_insert ON public.dao_tao_lan_thi
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = (select auth.uid()));

DROP POLICY IF EXISTS dao_tao_lan_thi_update ON public.dao_tao_lan_thi;
CREATE POLICY dao_tao_lan_thi_update ON public.dao_tao_lan_thi
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user((select auth.uid()))
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR auth_user_id = (select auth.uid())
  )
  WITH CHECK (
    public.is_admin_user((select auth.uid()))
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR auth_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_select ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_select ON public.dao_tao_lan_thi_cau
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user((select auth.uid()))
          OR public.fn_sys_has_permission('DAO_TAO', 'view')
          OR lt.auth_user_id = (select auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_insert ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_insert ON public.dao_tao_lan_thi_cau
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id AND lt.auth_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS dao_tao_lan_thi_cau_update ON public.dao_tao_lan_thi_cau;
CREATE POLICY dao_tao_lan_thi_cau_update ON public.dao_tao_lan_thi_cau
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user((select auth.uid()))
          OR public.fn_sys_has_permission('DAO_TAO', 'edit')
          OR lt.auth_user_id = (select auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dao_tao_lan_thi lt
      WHERE lt.id = lan_thi_id
        AND (
          public.is_admin_user((select auth.uid()))
          OR public.fn_sys_has_permission('DAO_TAO', 'edit')
          OR lt.auth_user_id = (select auth.uid())
        )
    )
  );

-- 3) Index hỗ trợ list mẻ active (đã có created_at DESC; bổ sung partial is_active)
CREATE INDEX IF NOT EXISTS idx_cssd_lo_active_created
  ON public.cssd_fact_lo_tiet_khuan (created_at DESC, id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nkbv_sk_active_ngay_phat_hien
  ON public.nkbv_fact_su_kien (ngay_phat_hien DESC, id)
  WHERE is_active = true;
