-- NKBV: ngày–khoa + ngày–dụng cụ = SSOT lưới; xóa demo; bỏ LabID + sổ đặt–rút nhập tay.

BEGIN;

-- 1. Demo: xóa ca / BA / LIS / mốc / sổ cũ. Giữ mau_so_* (mẫu số khoa nhập tay).
TRUNCATE TABLE
  public.nkbv_fact_labid_event,
  public.nkbv_fact_su_kien,
  public.nkbv_fact_ba_timeline,
  public.nkbv_fact_device_registry,
  public.nkbv_fact_vi_sinh,
  public.nkbv_fact_benh_an
RESTART IDENTITY CASCADE;

-- 2. Khoa theo từng ngày lịch (một ngày một khoa)
CREATE TABLE IF NOT EXISTS public.nkbv_fact_ba_ngay_khoa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL REFERENCES public.nkbv_fact_benh_an (ma_benh_an)
    ON UPDATE CASCADE ON DELETE CASCADE,
  ngay_lich date NOT NULL,
  khoa_id uuid NOT NULL REFERENCES public.mdm_dm_khoa_phong (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT nkbv_fact_ba_ngay_khoa_ba_ngay_key UNIQUE (ma_benh_an, ngay_lich)
);

COMMENT ON TABLE public.nkbv_fact_ba_ngay_khoa IS
  'Khoa điều trị từng ngày lịch trên lưới BA — chọn từ mdm_dm_khoa_phong.';

CREATE INDEX IF NOT EXISTS idx_nkbv_ba_ngay_khoa_khoa
  ON public.nkbv_fact_ba_ngay_khoa (khoa_id, ngay_lich);

ALTER TABLE public.nkbv_fact_ba_ngay_khoa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_ba_ngay_khoa_select ON public.nkbv_fact_ba_ngay_khoa;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_khoa_insert ON public.nkbv_fact_ba_ngay_khoa;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_khoa_update ON public.nkbv_fact_ba_ngay_khoa;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_khoa_delete ON public.nkbv_fact_ba_ngay_khoa;

CREATE POLICY nkbv_fact_ba_ngay_khoa_select ON public.nkbv_fact_ba_ngay_khoa
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_ba_ngay_khoa_insert ON public.nkbv_fact_ba_ngay_khoa
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_ba_ngay_khoa_update ON public.nkbv_fact_ba_ngay_khoa
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_ba_ngay_khoa_delete ON public.nkbv_fact_ba_ngay_khoa
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete')
    OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_ba_ngay_khoa TO authenticated;
GRANT ALL ON public.nkbv_fact_ba_ngay_khoa TO service_role;

-- 3. Foley / máy / CVC từng ngày (tích = có dòng)
CREATE TABLE IF NOT EXISTS public.nkbv_fact_ba_ngay_dung_cu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL REFERENCES public.nkbv_fact_benh_an (ma_benh_an)
    ON UPDATE CASCADE ON DELETE CASCADE,
  ngay_lich date NOT NULL,
  loai_dung_cu text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT nkbv_fact_ba_ngay_dung_cu_loai_chk CHECK (
    loai_dung_cu IN ('CVC', 'VENT', 'FOLEY')
  ),
  CONSTRAINT nkbv_fact_ba_ngay_dung_cu_ba_ngay_loai_key UNIQUE (ma_benh_an, ngay_lich, loai_dung_cu)
);

COMMENT ON TABLE public.nkbv_fact_ba_ngay_dung_cu IS
  'Ngày dụng cụ trên lưới BA — tích = có; bỏ tích = xóa dòng. Không nhập sổ đặt–rút.';

CREATE INDEX IF NOT EXISTS idx_nkbv_ba_ngay_dung_cu_loai
  ON public.nkbv_fact_ba_ngay_dung_cu (loai_dung_cu, ngay_lich);

ALTER TABLE public.nkbv_fact_ba_ngay_dung_cu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_ba_ngay_dung_cu_select ON public.nkbv_fact_ba_ngay_dung_cu;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_dung_cu_insert ON public.nkbv_fact_ba_ngay_dung_cu;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_dung_cu_update ON public.nkbv_fact_ba_ngay_dung_cu;
DROP POLICY IF EXISTS nkbv_fact_ba_ngay_dung_cu_delete ON public.nkbv_fact_ba_ngay_dung_cu;

CREATE POLICY nkbv_fact_ba_ngay_dung_cu_select ON public.nkbv_fact_ba_ngay_dung_cu
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_ba_ngay_dung_cu_insert ON public.nkbv_fact_ba_ngay_dung_cu
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_ba_ngay_dung_cu_update ON public.nkbv_fact_ba_ngay_dung_cu
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_ba_ngay_dung_cu_delete ON public.nkbv_fact_ba_ngay_dung_cu
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete')
    OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_ba_ngay_dung_cu TO authenticated;
GRANT ALL ON public.nkbv_fact_ba_ngay_dung_cu TO service_role;

-- 4. Sổ đặt–rút chỉ đọc (chuỗi ngày liền)
CREATE OR REPLACE VIEW public.nkbv_v_ba_dung_cu_dat_rut
WITH (security_invoker = true) AS
SELECT
  ma_benh_an,
  loai_dung_cu,
  min(ngay_lich) AS ngay_dat,
  max(ngay_lich) AS ngay_rut
FROM (
  SELECT
    ma_benh_an,
    loai_dung_cu,
    ngay_lich,
    (ngay_lich - (row_number() OVER (
      PARTITION BY ma_benh_an, loai_dung_cu ORDER BY ngay_lich
    ))::integer) AS grp
  FROM public.nkbv_fact_ba_ngay_dung_cu
) s
GROUP BY ma_benh_an, loai_dung_cu, grp;

GRANT SELECT ON public.nkbv_v_ba_dung_cu_dat_rut TO authenticated;

-- 5. Timeline: không nhét device_* vào triệu chứng
ALTER TABLE public.nkbv_fact_ba_timeline
  DROP CONSTRAINT IF EXISTS nkbv_fact_ba_timeline_no_device_key_chk;
ALTER TABLE public.nkbv_fact_ba_timeline
  ADD CONSTRAINT nkbv_fact_ba_timeline_no_device_key_chk
  CHECK (criteria_key IS NULL OR criteria_key NOT LIKE 'device_%');

-- 6. Hub RPC: location_days + device_days thay registry
CREATE OR REPLACE FUNCTION public.fn_nkbv_ba_hub(p_ma_benh_an text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'stay', (
      SELECT to_jsonb(s)
      FROM (
        SELECT id, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh,
               ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, ket_cuc_dieu_tri,
               ly_do_tu_vong, tu_vong_lien_quan_nkbv
        FROM public.nkbv_fact_benh_an
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        LIMIT 1
      ) s
    ),
    'lis', COALESCE((
      SELECT jsonb_agg(to_jsonb(l))
      FROM (
        SELECT id, ma_xet_nghiem, loai_benh_pham, loai_benh_pham_chuan, ngay_lay_mau, tac_nhan, so_luong,
               ket_qua_phan_loai, ket_qua_duong_tinh, is_mdro, mdro_phenotype, metadata
        FROM public.nkbv_fact_vi_sinh
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_lay_mau ASC
        LIMIT 200
      ) l
    ), '[]'::jsonb),
    'cases', COALESCE((
      SELECT jsonb_agg(to_jsonb(c))
      FROM (
        SELECT id, ma_ca, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten,
               ngay_phat_hien, vi_tri_nhiem_khuan, verification_data, tac_nhan_vi_khuan,
               khoa_ghi_nhan_id
        FROM public.v_nkbv_su_kien_full
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY ngay_phat_hien DESC
        LIMIT 100
      ) c
    ), '[]'::jsonb),
    'location_days', COALESCE((
      SELECT jsonb_agg(to_jsonb(k) ORDER BY k.ngay_lich)
      FROM (
        SELECT ngay_lich, khoa_id
        FROM public.nkbv_fact_ba_ngay_khoa
        WHERE ma_benh_an = p_ma_benh_an
        ORDER BY ngay_lich ASC
        LIMIT 400
      ) k
    ), '[]'::jsonb),
    'device_days', COALESCE((
      SELECT jsonb_agg(to_jsonb(d) ORDER BY d.ngay_lich, d.loai_dung_cu)
      FROM (
        SELECT id, ngay_lich, loai_dung_cu
        FROM public.nkbv_fact_ba_ngay_dung_cu
        WHERE ma_benh_an = p_ma_benh_an
        ORDER BY ngay_lich ASC
        LIMIT 800
      ) d
    ), '[]'::jsonb),
    'devices', COALESCE((
      SELECT jsonb_agg(to_jsonb(v))
      FROM (
        SELECT
          ma_benh_an || ':' || loai_dung_cu || ':' || ngay_dat::text AS id,
          CASE loai_dung_cu
            WHEN 'CVC' THEN 'CENTRAL_LINE'
            WHEN 'VENT' THEN 'VENTILATOR'
            ELSE 'FOLEY'
          END AS device_type,
          ngay_dat AS insertion_date,
          ngay_rut AS removal_date,
          true AS is_active
        FROM public.nkbv_v_ba_dung_cu_dat_rut
        WHERE ma_benh_an = p_ma_benh_an
        LIMIT 50
      ) v
    ), '[]'::jsonb),
    'manual', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM (
        SELECT id, milestone_kind, milestone_date, title, detail, specimen_hint, criteria_key
        FROM public.nkbv_fact_ba_timeline
        WHERE ma_benh_an = p_ma_benh_an AND is_active = true
        ORDER BY milestone_date ASC
        LIMIT 200
      ) m
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.fn_nkbv_ba_hub(text) IS
  'Hub BA: stay + LIS + phiếu + ngày–khoa + ngày–dụng cụ + mốc lâm sàng.';

-- 7. Bỏ LabID + sổ đặt–rút nhập tay
DROP VIEW IF EXISTS public.fact_nkbv_device_registry;
DROP TABLE IF EXISTS public.nkbv_fact_labid_event CASCADE;
DROP TABLE IF EXISTS public.nkbv_fact_device_registry CASCADE;

COMMIT;
