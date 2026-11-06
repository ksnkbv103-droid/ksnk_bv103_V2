-- 20261105110000_ctyt_dovai_lean_ledger_and_stats.sql
-- Module Hậu cần KSNK: Quản lý Chất thải Y tế (QT.11) & Đồ vải Y tế (QT.12)
-- Kế hoạch v2 tinh gọn: Cân tại nhà rác/ĐVGL (cả viện), mẫu số ngày-giường nhập tay, cờ sự cố gắn khoa.
-- Quyết định PO 2026-11-05:
--   1. Cân cả viện, do nhân viên KSNK giám sát và nhập liệu.
--   2. Chất thải chia 3 nhóm: Lây nhiễm sắc nhọn, Lây nhiễm còn lại (gộp), Thông thường.
--   3. Đồ vải chia 3 nhóm: Bẩn thường, Bẩn lây nhiễm, Sạch về.
--   4. Mẫu số ngày-giường toàn viện theo tháng nhập tay.
--   5. Sự cố là bản ghi riêng có khoa liên quan (từ nhãn túi).

-- 1) Quyền truy cập module HAU_CAN_MOI_TRUONG
INSERT INTO public.sys_permissions (module_name, action, description)
VALUES 
  ('HAU_CAN_MOI_TRUONG', 'view', 'Xem số liệu cân chất thải, đồ vải và thống kê KSNK'),
  ('HAU_CAN_MOI_TRUONG', 'create', 'Nhập số liệu cân chất thải, đồ vải và ghi nhận sự cố'),
  ('HAU_CAN_MOI_TRUONG', 'edit', 'Sửa số liệu cân chất thải, đồ vải trong ngày'),
  ('HAU_CAN_MOI_TRUONG', 'delete', 'Xóa mềm bản ghi sổ cân hoặc sự cố')
ON CONFLICT (module_name, action) DO UPDATE SET description = EXCLUDED.description;

-- Gán quyền cho ADMIN
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'ADMIN'
  AND p.module_name = 'HAU_CAN_MOI_TRUONG'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Gán quyền cho NHAN_VIEN_KSNK (chỉ create — PO 2026-11-06)
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'NHAN_VIEN_KSNK'
  AND p.module_name = 'HAU_CAN_MOI_TRUONG'
  AND p.action = 'create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Gán quyền cho HOI_DONG_KSNK (view)
INSERT INTO public.sys_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.sys_roles r
CROSS JOIN public.sys_permissions p
WHERE r.name = 'HOI_DONG_KSNK'
  AND p.module_name = 'HAU_CAN_MOI_TRUONG'
  AND p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2) Bảng danh mục Ngày-giường thực kê toàn viện theo tháng (mẫu số chuẩn hóa)
CREATE TABLE IF NOT EXISTS public.ctyt_dovai_dm_ngay_giuong (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nam int NOT NULL CHECK (nam >= 2020 AND nam <= 2100),
  thang int NOT NULL CHECK (thang >= 1 AND thang <= 12),
  so_ngay_giuong numeric(10,1) NOT NULL CHECK (so_ngay_giuong > 0),
  ghi_chu text,
  nguoi_cap_nhat_id uuid REFERENCES public.mdm_nhan_su(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ctyt_dovai_dm_ngay_giuong_nam_thang UNIQUE (nam, thang)
);

COMMENT ON TABLE public.ctyt_dovai_dm_ngay_giuong IS 'Mẫu số ngày-giường thực kê toàn viện theo tháng từ KHTH phục vụ tính tỷ suất kg/1.000 ngày-giường.';

-- 3) Bảng Sổ cân toàn viện (Chất thải y tế & Đồ vải)
CREATE TABLE IF NOT EXISTS public.ctyt_dovai_fact_so_can (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_can date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  loai_muc text NOT NULL CHECK (
    loai_muc IN (
      'CT_LAY_NHIEM_SAC_NHON',
      'CT_LAY_NHIEM_CON_LAI',
      'CT_THONG_THUONG',
      'DO_VAI_BAN_THUONG',
      'DO_VAI_BAN_LAY_NHIEM',
      'DO_VAI_SACH_VE'
    )
  ),
  khoi_luong_kg numeric(10,2) NOT NULL CHECK (khoi_luong_kg >= 0),
  so_tui int CHECK (so_tui IS NULL OR so_tui >= 0),
  ghi_chu text,
  nguoi_ghi_id uuid REFERENCES public.mdm_nhan_su(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ctyt_dovai_fact_so_can_ngay_loai UNIQUE (ngay_can, loai_muc)
);

CREATE INDEX IF NOT EXISTS idx_ctyt_dovai_so_can_ngay_loai 
  ON public.ctyt_dovai_fact_so_can (ngay_can, loai_muc) 
  WHERE is_active = true;

COMMENT ON TABLE public.ctyt_dovai_fact_so_can IS 'Sổ cân định lượng khối lượng chất thải và đồ vải toàn viện theo ngày tại nhà rác và ĐVGL.';

-- 4) Bảng Ghi nhận Sự cố an toàn sinh học (có gắn khoa từ nhãn túi)
CREATE TABLE IF NOT EXISTS public.ctyt_dovai_fact_su_co (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay_ghi_nhan date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
  phan_he text NOT NULL CHECK (phan_he IN ('CHAT_THAI', 'DO_VAI')),
  loai_su_co text NOT NULL CHECK (
    loai_su_co IN (
      'TUI_RACH',
      'HOP_KHONG_DONG_NAP',
      'PHAN_LOAI_SAI',
      'LAN_SAC_NHON_DO_VAI',
      'DO_VAI_RACH_HONG',
      'KHAC'
    )
  ),
  khoa_lien_quan_id uuid REFERENCES public.mdm_dm_khoa_phong(id),
  mo_ta text,
  nguoi_ghi_id uuid REFERENCES public.mdm_nhan_su(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ctyt_dovai_su_co_ngay_khoa 
  ON public.ctyt_dovai_fact_su_co (ngay_ghi_nhan, khoa_lien_quan_id) 
  WHERE is_active = true;

COMMENT ON TABLE public.ctyt_dovai_fact_su_co IS 'Sự cố phát hiện trong quá trình thu gom, tiếp nhận chất thải và đồ vải, gắn theo khoa liên quan.';

-- 5) RLS Policies
ALTER TABLE public.ctyt_dovai_dm_ngay_giuong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctyt_dovai_fact_so_can ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctyt_dovai_fact_su_co ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ctyt_dovai_dm_ngay_giuong_select ON public.ctyt_dovai_dm_ngay_giuong;
DROP POLICY IF EXISTS ctyt_dovai_dm_ngay_giuong_modify ON public.ctyt_dovai_dm_ngay_giuong;

CREATE POLICY ctyt_dovai_dm_ngay_giuong_select ON public.ctyt_dovai_dm_ngay_giuong
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'view'));

CREATE POLICY ctyt_dovai_dm_ngay_giuong_modify ON public.ctyt_dovai_dm_ngay_giuong
  FOR ALL TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'));

DROP POLICY IF EXISTS ctyt_dovai_fact_so_can_select ON public.ctyt_dovai_fact_so_can;
DROP POLICY IF EXISTS ctyt_dovai_fact_so_can_insert ON public.ctyt_dovai_fact_so_can;
DROP POLICY IF EXISTS ctyt_dovai_fact_so_can_update ON public.ctyt_dovai_fact_so_can;
DROP POLICY IF EXISTS ctyt_dovai_fact_so_can_delete ON public.ctyt_dovai_fact_so_can;

CREATE POLICY ctyt_dovai_fact_so_can_select ON public.ctyt_dovai_fact_so_can
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'view'));

CREATE POLICY ctyt_dovai_fact_so_can_insert ON public.ctyt_dovai_fact_so_can
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'create'));

CREATE POLICY ctyt_dovai_fact_so_can_update ON public.ctyt_dovai_fact_so_can
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'));

CREATE POLICY ctyt_dovai_fact_so_can_delete ON public.ctyt_dovai_fact_so_can
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'delete'));

DROP POLICY IF EXISTS ctyt_dovai_fact_su_co_select ON public.ctyt_dovai_fact_su_co;
DROP POLICY IF EXISTS ctyt_dovai_fact_su_co_insert ON public.ctyt_dovai_fact_su_co;
DROP POLICY IF EXISTS ctyt_dovai_fact_su_co_update ON public.ctyt_dovai_fact_su_co;
DROP POLICY IF EXISTS ctyt_dovai_fact_su_co_delete ON public.ctyt_dovai_fact_su_co;

CREATE POLICY ctyt_dovai_fact_su_co_select ON public.ctyt_dovai_fact_su_co
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'view'));

CREATE POLICY ctyt_dovai_fact_su_co_insert ON public.ctyt_dovai_fact_su_co
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'create'));

CREATE POLICY ctyt_dovai_fact_su_co_update ON public.ctyt_dovai_fact_su_co
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'edit'));

CREATE POLICY ctyt_dovai_fact_su_co_delete ON public.ctyt_dovai_fact_su_co
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('HAU_CAN_MOI_TRUONG', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ctyt_dovai_dm_ngay_giuong TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ctyt_dovai_fact_so_can TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ctyt_dovai_fact_su_co TO authenticated, service_role;

-- 6) RPC Thống kê định lượng kỳ phục vụ Dashboard & Báo cáo tổng hợp
CREATE OR REPLACE FUNCTION public.rpc_ctyt_dovai_thong_ke_ky(
  p_tu_ngay date,
  p_den_ngay date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
  v_kg_sac_nhon numeric := 0;
  v_kg_con_lai numeric := 0;
  v_kg_thong_thuong numeric := 0;
  v_tong_ctln numeric := 0;
  v_tong_ct numeric := 0;
  v_ty_le_ctln numeric := 0;
  
  v_kg_ban_thuong numeric := 0;
  v_kg_ban_ln numeric := 0;
  v_tong_ban numeric := 0;
  v_ty_le_ban_ln numeric := 0;
  v_kg_sach_ve numeric := 0;
  v_chenh_lech numeric := 0;
  v_ty_le_chenh_lech numeric := 0;
  
  v_tong_ngay_giuong numeric := 0;
  v_ct_rate_1000 numeric := 0;
  v_dv_rate_1000 numeric := 0;
  
  v_so_ngay_ky int := 0;
  v_so_ngay_co_du_lieu int := 0;
  v_ty_le_day_du numeric := 0;
  
  v_su_co_chat_thai_count int := 0;
  v_su_co_do_vai_count int := 0;
  v_su_co_sac_nhon_count int := 0;
BEGIN
  IF p_tu_ngay IS NULL OR p_den_ngay IS NULL OR p_tu_ngay > p_den_ngay THEN
    RETURN jsonb_build_object('error', 'Khoảng ngày không hợp lệ');
  END IF;

  v_so_ngay_ky := (p_den_ngay - p_tu_ngay) + 1;

  -- 1. Tổng hợp số cân
  SELECT
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_LAY_NHIEM_SAC_NHON' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_LAY_NHIEM_CON_LAI' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'CT_THONG_THUONG' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_BAN_THUONG' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_BAN_LAY_NHIEM' THEN khoi_luong_kg ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN loai_muc = 'DO_VAI_SACH_VE' THEN khoi_luong_kg ELSE 0 END), 0),
    COUNT(DISTINCT ngay_can)
  INTO
    v_kg_sac_nhon,
    v_kg_con_lai,
    v_kg_thong_thuong,
    v_kg_ban_thuong,
    v_kg_ban_ln,
    v_kg_sach_ve,
    v_so_ngay_co_du_lieu
  FROM public.ctyt_dovai_fact_so_can
  WHERE is_active = true
    AND ngay_can BETWEEN p_tu_ngay AND p_den_ngay;

  v_tong_ctln := v_kg_sac_nhon + v_kg_con_lai;
  v_tong_ct := v_tong_ctln + v_kg_thong_thuong;
  IF v_tong_ct > 0 THEN
    v_ty_le_ctln := ROUND((v_tong_ctln / v_tong_ct) * 100, 2);
  END IF;

  v_tong_ban := v_kg_ban_thuong + v_kg_ban_ln;
  IF v_tong_ban > 0 THEN
    v_ty_le_ban_ln := ROUND((v_kg_ban_ln / v_tong_ban) * 100, 2);
    v_chenh_lech := v_tong_ban - v_kg_sach_ve;
    v_ty_le_chenh_lech := ROUND((v_chenh_lech / v_tong_ban) * 100, 2);
  END IF;

  IF v_so_ngay_ky > 0 THEN
    v_ty_le_day_du := ROUND((v_so_ngay_co_du_lieu::numeric / v_so_ngay_ky::numeric) * 100, 1);
  END IF;

  -- 2. Ngày giường từ danh mục mẫu số theo các tháng giao thoa
  SELECT COALESCE(SUM(
    so_ngay_giuong * (
      -- Tỷ lệ ngày của tháng nằm trong khoảng lọc
      LEAST(p_den_ngay, (make_date(nam, thang, 1) + interval '1 month - 1 day')::date) - 
      GREATEST(p_tu_ngay, make_date(nam, thang, 1)) + 1
    )::numeric / EXTRACT(DAY FROM (make_date(nam, thang, 1) + interval '1 month - 1 day'))::numeric
  ), 0)
  INTO v_tong_ngay_giuong
  FROM public.ctyt_dovai_dm_ngay_giuong
  WHERE make_date(nam, thang, 1) <= p_den_ngay
    AND (make_date(nam, thang, 1) + interval '1 month - 1 day')::date >= p_tu_ngay;

  IF v_tong_ngay_giuong > 0 THEN
    v_ct_rate_1000 := ROUND((v_tong_ct / v_tong_ngay_giuong) * 1000, 2);
    v_dv_rate_1000 := ROUND((v_tong_ban / v_tong_ngay_giuong) * 1000, 2);
  END IF;

  -- 3. Tổng hợp sự cố
  SELECT
    COUNT(*) FILTER (WHERE phan_he = 'CHAT_THAI'),
    COUNT(*) FILTER (WHERE phan_he = 'DO_VAI'),
    COUNT(*) FILTER (WHERE loai_su_co = 'LAN_SAC_NHON_DO_VAI')
  INTO
    v_su_co_chat_thai_count,
    v_su_co_do_vai_count,
    v_su_co_sac_nhon_count
  FROM public.ctyt_dovai_fact_su_co
  WHERE is_active = true
    AND ngay_ghi_nhan BETWEEN p_tu_ngay AND p_den_ngay;

  RETURN jsonb_build_object(
    'tu_ngay', p_tu_ngay,
    'den_ngay', p_den_ngay,
    'so_ngay_ky', v_so_ngay_ky,
    'so_ngay_co_du_lieu', v_so_ngay_co_du_lieu,
    'ty_le_day_du_pct', v_ty_le_day_du,
    'tong_ngay_giuong', v_tong_ngay_giuong,
    'chat_thai', jsonb_build_object(
      'kg_sac_nhon', v_kg_sac_nhon,
      'kg_con_lai', v_kg_con_lai,
      'kg_thong_thuong', v_kg_thong_thuong,
      'tong_ctln_kg', v_tong_ctln,
      'tong_chat_thai_kg', v_tong_ct,
      'ty_le_ctln_pct', v_ty_le_ctln,
      'chat_thai_per_1000_ngay_giuong', v_ct_rate_1000,
      'so_su_co', v_su_co_chat_thai_count
    ),
    'do_vai', jsonb_build_object(
      'kg_ban_thuong', v_kg_ban_thuong,
      'kg_ban_lay_nhiem', v_kg_ban_ln,
      'tong_ban_kg', v_tong_ban,
      'ty_le_ban_ln_pct', v_ty_le_ban_ln,
      'kg_sach_ve', v_kg_sach_ve,
      'chenh_lech_kg', v_chenh_lech,
      'ty_le_chenh_lech_pct', v_ty_le_chenh_lech,
      'do_vai_per_1000_ngay_giuong', v_dv_rate_1000,
      'so_su_co_chung', v_su_co_do_vai_count,
      'so_su_co_sac_nhon', v_su_co_sac_nhon_count
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ctyt_dovai_thong_ke_ky(date, date) TO authenticated, service_role;
