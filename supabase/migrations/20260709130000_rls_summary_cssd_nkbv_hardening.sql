-- P2 DB-03/08: siết RLS CSSD bao_tri/kho + NKBV fact (module-scoped).
-- DB-02: gstt_fact_*_summary là VIEW live (20260604140000) — không gắn POLICY;
--        DROP policy legacy nếu còn sót trên relation; đọc qua underlying fact RLS + RPC.

BEGIN;

-- === DB-02: dọn policy legacy trên summary (no-op nếu đã là VIEW không còn policy) ===
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.gstt_fact_gsc_dashboard_summary;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.gstt_fact_gsc_violations_summary;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.gstt_fact_vst_moments_summary;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.gstt_fact_vst_opportunities_summary;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.gstt_fact_vst_sessions_summary;

-- === DB-03: CSSD bao_tri + kho giao dịch ===
DROP POLICY IF EXISTS fact_bao_tri_thiet_bi_all_auth ON public.cssd_fact_bao_tri;
DROP POLICY IF EXISTS fact_bao_tri_thiet_bi_select_auth ON public.cssd_fact_bao_tri;
DROP POLICY IF EXISTS cssd_fact_bao_tri_select ON public.cssd_fact_bao_tri;
DROP POLICY IF EXISTS cssd_fact_bao_tri_write ON public.cssd_fact_bao_tri;
CREATE POLICY cssd_fact_bao_tri_select ON public.cssd_fact_bao_tri
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('THIET_BI', 'view')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'view')
  );
CREATE POLICY cssd_fact_bao_tri_insert ON public.cssd_fact_bao_tri
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('THIET_BI', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  );
CREATE POLICY cssd_fact_bao_tri_update ON public.cssd_fact_bao_tri
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('THIET_BI', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('THIET_BI', 'edit')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  );
CREATE POLICY cssd_fact_bao_tri_delete ON public.cssd_fact_bao_tri
  FOR DELETE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('THIET_BI', 'delete')
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
  );

DROP POLICY IF EXISTS fact_kho_dung_cu_giao_dich_all_auth ON public.cssd_fact_kho_giao_dich;
DROP POLICY IF EXISTS fact_kho_dung_cu_giao_dich_select_auth ON public.cssd_fact_kho_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_giao_dich_select ON public.cssd_fact_kho_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_giao_dich_write ON public.cssd_fact_kho_giao_dich;
CREATE POLICY cssd_fact_kho_giao_dich_select ON public.cssd_fact_kho_giao_dich
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view')
  );
CREATE POLICY cssd_fact_kho_giao_dich_insert ON public.cssd_fact_kho_giao_dich
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  );
CREATE POLICY cssd_fact_kho_giao_dich_update ON public.cssd_fact_kho_giao_dich
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  );
CREATE POLICY cssd_fact_kho_giao_dich_delete ON public.cssd_fact_kho_giao_dich
  FOR DELETE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'delete')
  );

DROP POLICY IF EXISTS fact_kho_hc_all_auth ON public.cssd_fact_kho_hoa_chat_giao_dich;
DROP POLICY IF EXISTS fact_kho_hc_select_auth ON public.cssd_fact_kho_hoa_chat_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_hoa_chat_giao_dich_select ON public.cssd_fact_kho_hoa_chat_giao_dich;
DROP POLICY IF EXISTS cssd_fact_kho_hoa_chat_giao_dich_write ON public.cssd_fact_kho_hoa_chat_giao_dich;
CREATE POLICY cssd_fact_kho_hoa_chat_giao_dich_select ON public.cssd_fact_kho_hoa_chat_giao_dich
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('HOA_CHAT', 'view')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view')
  );
CREATE POLICY cssd_fact_kho_hoa_chat_giao_dich_insert ON public.cssd_fact_kho_hoa_chat_giao_dich
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('HOA_CHAT', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  );
CREATE POLICY cssd_fact_kho_hoa_chat_giao_dich_update ON public.cssd_fact_kho_hoa_chat_giao_dich
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('HOA_CHAT', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('HOA_CHAT', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  );
CREATE POLICY cssd_fact_kho_hoa_chat_giao_dich_delete ON public.cssd_fact_kho_hoa_chat_giao_dich
  FOR DELETE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('HOA_CHAT', 'delete')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'delete')
  );

-- === DB-08: NKBV fact — module GIAM_SAT_NKBV ===
DROP POLICY IF EXISTS fact_nkbv_benh_an_delete ON public.nkbv_fact_benh_an;
DROP POLICY IF EXISTS fact_nkbv_benh_an_insert ON public.nkbv_fact_benh_an;
DROP POLICY IF EXISTS fact_nkbv_benh_an_select ON public.nkbv_fact_benh_an;
DROP POLICY IF EXISTS fact_nkbv_benh_an_update ON public.nkbv_fact_benh_an;
CREATE POLICY nkbv_fact_benh_an_select ON public.nkbv_fact_benh_an
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_benh_an_insert ON public.nkbv_fact_benh_an
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_benh_an_update ON public.nkbv_fact_benh_an
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_benh_an_delete ON public.nkbv_fact_benh_an
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

DROP POLICY IF EXISTS fact_nkbv_su_kien_delete ON public.nkbv_fact_su_kien;
DROP POLICY IF EXISTS fact_nkbv_su_kien_insert ON public.nkbv_fact_su_kien;
DROP POLICY IF EXISTS fact_nkbv_su_kien_select ON public.nkbv_fact_su_kien;
DROP POLICY IF EXISTS fact_nkbv_su_kien_update ON public.nkbv_fact_su_kien;
CREATE POLICY nkbv_fact_su_kien_select ON public.nkbv_fact_su_kien
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_su_kien_insert ON public.nkbv_fact_su_kien
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_su_kien_update ON public.nkbv_fact_su_kien
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_su_kien_delete ON public.nkbv_fact_su_kien
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

DROP POLICY IF EXISTS fact_nkbv_vi_sinh_delete ON public.nkbv_fact_vi_sinh;
DROP POLICY IF EXISTS fact_nkbv_vi_sinh_insert ON public.nkbv_fact_vi_sinh;
DROP POLICY IF EXISTS fact_nkbv_vi_sinh_select ON public.nkbv_fact_vi_sinh;
DROP POLICY IF EXISTS fact_nkbv_vi_sinh_update ON public.nkbv_fact_vi_sinh;
CREATE POLICY nkbv_fact_vi_sinh_select ON public.nkbv_fact_vi_sinh
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_vi_sinh_insert ON public.nkbv_fact_vi_sinh
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_vi_sinh_update ON public.nkbv_fact_vi_sinh
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_vi_sinh_delete ON public.nkbv_fact_vi_sinh
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

DROP POLICY IF EXISTS fact_nkbv_mau_so_daily_delete ON public.nkbv_fact_mau_so_daily;
DROP POLICY IF EXISTS fact_nkbv_mau_so_daily_insert ON public.nkbv_fact_mau_so_daily;
DROP POLICY IF EXISTS fact_nkbv_mau_so_daily_select ON public.nkbv_fact_mau_so_daily;
DROP POLICY IF EXISTS fact_nkbv_mau_so_daily_update ON public.nkbv_fact_mau_so_daily;
CREATE POLICY nkbv_fact_mau_so_daily_select ON public.nkbv_fact_mau_so_daily
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_mau_so_daily_insert ON public.nkbv_fact_mau_so_daily
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_mau_so_daily_update ON public.nkbv_fact_mau_so_daily
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_mau_so_daily_delete ON public.nkbv_fact_mau_so_daily
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

DROP POLICY IF EXISTS fact_nkbv_mau_so_phau_thuat_delete ON public.nkbv_fact_mau_so_phau_thuat;
DROP POLICY IF EXISTS fact_nkbv_mau_so_phau_thuat_insert ON public.nkbv_fact_mau_so_phau_thuat;
DROP POLICY IF EXISTS fact_nkbv_mau_so_phau_thuat_select ON public.nkbv_fact_mau_so_phau_thuat;
DROP POLICY IF EXISTS fact_nkbv_mau_so_phau_thuat_update ON public.nkbv_fact_mau_so_phau_thuat;
CREATE POLICY nkbv_fact_mau_so_phau_thuat_select ON public.nkbv_fact_mau_so_phau_thuat
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_mau_so_phau_thuat_insert ON public.nkbv_fact_mau_so_phau_thuat
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_mau_so_phau_thuat_update ON public.nkbv_fact_mau_so_phau_thuat
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_mau_so_phau_thuat_delete ON public.nkbv_fact_mau_so_phau_thuat
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

NOTIFY pgrst, 'reload schema';

COMMIT;
