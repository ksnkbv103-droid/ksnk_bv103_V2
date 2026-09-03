-- Đề xuất thay đổi danh mục dụng cụ: KTV gửi, tổ trưởng/ADMIN duyệt rồi mới ghi cssd_dm_*.
-- Không thay ledger Hỏng/Mất/Bổ sung/Điều chuyển — điều chuyển sau duyệt vẫn ghi cssd_fact_kho_giao_dich.

CREATE TABLE IF NOT EXISTS public.cssd_fact_de_xuat_danh_muc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loai_thao_tac text NOT NULL
    CHECK (loai_thao_tac IN ('THEM', 'SUA', 'XOA', 'DIEU_CHUYEN')),
  doi_tuong text NOT NULL
    CHECK (doi_tuong IN ('LOAI_DUNG_CU', 'BO_DUNG_CU', 'CHI_TIET')),
  trang_thai text NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
  ly_do text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_truoc jsonb,
  snapshot_sau jsonb,
  bo_dung_cu_id uuid REFERENCES public.cssd_dm_bo_dung_cu(id),
  bo_dung_cu_id_den uuid REFERENCES public.cssd_dm_bo_dung_cu(id),
  loai_dung_cu_id uuid REFERENCES public.cssd_dm_loai_dung_cu(id),
  chi_tiet_id uuid REFERENCES public.cssd_dm_bo_dung_cu_chi_tiet(id),
  so_luong integer,
  nguoi_de_xuat_auth_id uuid,
  nguoi_de_xuat_email text,
  nguoi_duyet_auth_id uuid,
  nguoi_duyet_email text,
  duyet_at timestamptz,
  ly_do_tu_choi text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cssd_fact_de_xuat_danh_muc IS
  'Hàng đợi đề xuất thêm/sửa/xóa/điều chuyển danh mục dụng cụ. Chỉ ghi cssd_dm_* khi duyệt.';

CREATE INDEX IF NOT EXISTS idx_cssd_de_xuat_dm_cho
  ON public.cssd_fact_de_xuat_danh_muc (trang_thai, created_at DESC)
  WHERE is_active = true;

ALTER TABLE public.cssd_fact_de_xuat_danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cssd_fact_de_xuat_danh_muc FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cssd_fact_de_xuat_danh_muc_select ON public.cssd_fact_de_xuat_danh_muc;
CREATE POLICY cssd_fact_de_xuat_danh_muc_select ON public.cssd_fact_de_xuat_danh_muc
  FOR SELECT TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'view')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'view')
    OR public.fn_sys_has_permission('LOAI_DC', 'view')
    OR public.fn_sys_has_permission('BO_DC', 'view')
    OR public.fn_sys_has_permission('DC_LE', 'view')
  );

DROP POLICY IF EXISTS cssd_fact_de_xuat_danh_muc_insert ON public.cssd_fact_de_xuat_danh_muc;
CREATE POLICY cssd_fact_de_xuat_danh_muc_insert ON public.cssd_fact_de_xuat_danh_muc
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('CSSD_WORKFLOW', 'edit')
    OR public.fn_sys_has_permission('CSSD_KHO_DUNGCU', 'edit')
  );

DROP POLICY IF EXISTS cssd_fact_de_xuat_danh_muc_update ON public.cssd_fact_de_xuat_danh_muc;
CREATE POLICY cssd_fact_de_xuat_danh_muc_update ON public.cssd_fact_de_xuat_danh_muc
  FOR UPDATE TO authenticated
  USING (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('LOAI_DC', 'approve')
    OR public.fn_sys_has_permission('BO_DC', 'approve')
    OR public.fn_sys_has_permission('DC_LE', 'approve')
  )
  WITH CHECK (
    public.fn_sys_is_admin()
    OR public.fn_sys_has_permission('LOAI_DC', 'approve')
    OR public.fn_sys_has_permission('BO_DC', 'approve')
    OR public.fn_sys_has_permission('DC_LE', 'approve')
  );

GRANT SELECT, INSERT, UPDATE ON public.cssd_fact_de_xuat_danh_muc TO authenticated;
GRANT ALL ON public.cssd_fact_de_xuat_danh_muc TO service_role;

DROP TRIGGER IF EXISTS trg_cssd_fact_de_xuat_danh_muc_audit ON public.cssd_fact_de_xuat_danh_muc;
CREATE TRIGGER trg_cssd_fact_de_xuat_danh_muc_audit
  AFTER INSERT OR DELETE OR UPDATE ON public.cssd_fact_de_xuat_danh_muc
  FOR EACH ROW EXECUTE FUNCTION public.fn_sys_audit_row();
