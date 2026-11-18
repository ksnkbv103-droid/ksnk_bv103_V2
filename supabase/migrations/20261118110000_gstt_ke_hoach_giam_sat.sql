-- L4 GSTT: kế hoạch giám sát theo khoa/tháng (PO 2026-11-01, QT.KSNK.33) + RPC tiến độ.
--
-- Impact map:
--   * Bảng MỚI public.gstt_fact_ke_hoach_giam_sat (khoa × tháng × loại VST/GSC). Không có cột
--     chỉ tiêu: chỉ tiêu dùng chung mọi khoa = tham số p_chi_tieu của RPC (mặc định 1 phiên).
--   * RLS: SELECT = admin · khoa KSNK (toàn viện) · người có quyền GIAM_SAT_VST/GIAM_SAT_CHUNG
--     'view' (theo loai) chỉ khoa của mình. INSERT/UPDATE = admin hoặc khoa KSNK. Không DELETE
--     (xóa mềm is_active=false). Không thêm quyền mới.
--   * RPC MỚI public.fn_gstt_ke_hoach_tien_do(date, text, int) SECURITY INVOKER — đếm phiên
--     gstt_fact_vst_sessions / gstt_fact_chung_sessions (is_active, trong tháng) theo RLS người gọi.
--   * App server actions dùng service_role → bypass RLS. Không đụng bảng/policy/hàm khác.
--   * Không tạo bảng summary.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.fn_gstt_ke_hoach_tien_do(date, text, integer);
--   DROP TABLE IF EXISTS public.gstt_fact_ke_hoach_giam_sat;  -- (destructive nếu đã có dữ liệu)

CREATE TABLE IF NOT EXISTS public.gstt_fact_ke_hoach_giam_sat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khoa_id       uuid NOT NULL
                REFERENCES public.mdm_dm_khoa_phong(id) ON UPDATE CASCADE,
  thang         date NOT NULL,
  loai          text NOT NULL,
  nguoi_lap_id  uuid
                REFERENCES public.mdm_nhan_su(id) ON UPDATE CASCADE ON DELETE SET NULL,
  ghi_chu       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gstt_ke_hoach_thang_dau_thang_chk
    CHECK (thang = date_trunc('month', thang)::date),
  CONSTRAINT gstt_ke_hoach_loai_chk
    CHECK (loai IN ('VST', 'GSC'))
);

COMMENT ON TABLE public.gstt_fact_ke_hoach_giam_sat IS
  'Kế hoạch giám sát khoa/tháng (VST/GSC) — QT.KSNK.33, PO 2026-11-01. Chỉ tiêu = tham số RPC fn_gstt_ke_hoach_tien_do.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_gstt_ke_hoach_khoa_thang_loai_active
  ON public.gstt_fact_ke_hoach_giam_sat (khoa_id, thang, loai)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_gstt_ke_hoach_thang_loai_active
  ON public.gstt_fact_ke_hoach_giam_sat (thang, loai)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_gstt_ke_hoach_nguoi_lap_id
  ON public.gstt_fact_ke_hoach_giam_sat (nguoi_lap_id)
  WHERE nguoi_lap_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_gstt_ke_hoach_updated_at ON public.gstt_fact_ke_hoach_giam_sat;
CREATE TRIGGER trg_gstt_ke_hoach_updated_at
  BEFORE UPDATE ON public.gstt_fact_ke_hoach_giam_sat
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === Quyền bảng (default privileges đã thu) ===
REVOKE ALL ON public.gstt_fact_ke_hoach_giam_sat FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gstt_fact_ke_hoach_giam_sat TO authenticated;
GRANT ALL ON public.gstt_fact_ke_hoach_giam_sat TO service_role;

-- === RLS ===
ALTER TABLE public.gstt_fact_ke_hoach_giam_sat ENABLE ROW LEVEL SECURITY;

-- Khoa người dùng hiện tại: đọc qua policy mdm_nhan_su_select_self (auth_user_id = auth.uid()).
DROP POLICY IF EXISTS gstt_ke_hoach_select ON public.gstt_fact_ke_hoach_giam_sat;
CREATE POLICY gstt_ke_hoach_select
  ON public.gstt_fact_ke_hoach_giam_sat
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.fn_sys_is_admin())
    OR (
      SELECT ns.khoa_id FROM public.mdm_nhan_su ns
       WHERE ns.auth_user_id = (SELECT auth.uid()) AND ns.is_active = true
       LIMIT 1
    ) = (SELECT public.fn_qlcv_ksnk_khoa_id())
    OR (
      (
        (loai = 'VST' AND (SELECT public.fn_sys_has_permission('GIAM_SAT_VST', 'view')))
        OR (loai = 'GSC' AND (SELECT public.fn_sys_has_permission('GIAM_SAT_CHUNG', 'view')))
      )
      AND khoa_id = (
        SELECT ns.khoa_id FROM public.mdm_nhan_su ns
         WHERE ns.auth_user_id = (SELECT auth.uid()) AND ns.is_active = true
         LIMIT 1
      )
    )
  );

DROP POLICY IF EXISTS gstt_ke_hoach_insert ON public.gstt_fact_ke_hoach_giam_sat;
CREATE POLICY gstt_ke_hoach_insert
  ON public.gstt_fact_ke_hoach_giam_sat
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.fn_sys_is_admin())
    OR (
      SELECT ns.khoa_id FROM public.mdm_nhan_su ns
       WHERE ns.auth_user_id = (SELECT auth.uid()) AND ns.is_active = true
       LIMIT 1
    ) = (SELECT public.fn_qlcv_ksnk_khoa_id())
  );

DROP POLICY IF EXISTS gstt_ke_hoach_update ON public.gstt_fact_ke_hoach_giam_sat;
CREATE POLICY gstt_ke_hoach_update
  ON public.gstt_fact_ke_hoach_giam_sat
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.fn_sys_is_admin())
    OR (
      SELECT ns.khoa_id FROM public.mdm_nhan_su ns
       WHERE ns.auth_user_id = (SELECT auth.uid()) AND ns.is_active = true
       LIMIT 1
    ) = (SELECT public.fn_qlcv_ksnk_khoa_id())
  )
  WITH CHECK (
    (SELECT public.fn_sys_is_admin())
    OR (
      SELECT ns.khoa_id FROM public.mdm_nhan_su ns
       WHERE ns.auth_user_id = (SELECT auth.uid()) AND ns.is_active = true
       LIMIT 1
    ) = (SELECT public.fn_qlcv_ksnk_khoa_id())
  );

-- === RPC tiến độ ===
CREATE OR REPLACE FUNCTION public.fn_gstt_ke_hoach_tien_do(
  p_thang date,
  p_loai text,
  p_chi_tieu integer DEFAULT 1
)
RETURNS TABLE (
  khoa_id uuid,
  chi_tieu integer,
  so_phien integer,
  ty_le_hoan_thanh numeric,
  dat boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_thang IS NULL OR p_thang <> date_trunc('month', p_thang)::date THEN
    RAISE EXCEPTION 'p_thang phải là ngày đầu tháng (nhận: %)', p_thang
      USING ERRCODE = '22023';
  END IF;
  IF p_loai IS NULL OR p_loai NOT IN ('VST', 'GSC') THEN
    RAISE EXCEPTION 'p_loai phải là VST hoặc GSC (nhận: %)', p_loai
      USING ERRCODE = '22023';
  END IF;
  IF p_chi_tieu IS NULL OR p_chi_tieu < 1 THEN
    RAISE EXCEPTION 'p_chi_tieu phải >= 1 (nhận: %)', p_chi_tieu
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH kh AS (
    SELECT k.khoa_id
      FROM public.gstt_fact_ke_hoach_giam_sat k
     WHERE k.is_active = true
       AND k.thang = p_thang
       AND k.loai = p_loai
  ),
  phien AS (
    SELECT s.khoa_id, count(*)::integer AS n
      FROM public.gstt_fact_vst_sessions s
     WHERE p_loai = 'VST'
       AND s.is_active = true
       AND s.ngay_giam_sat >= p_thang
       AND s.ngay_giam_sat < (p_thang + interval '1 month')::date
       AND s.khoa_id IN (SELECT kh.khoa_id FROM kh)
     GROUP BY s.khoa_id
    UNION ALL
    SELECT s.khoa_id, count(*)::integer AS n
      FROM public.gstt_fact_chung_sessions s
     WHERE p_loai = 'GSC'
       AND s.is_active = true
       AND s.ngay_giam_sat >= p_thang
       AND s.ngay_giam_sat < (p_thang + interval '1 month')::date
       AND s.khoa_id IN (SELECT kh.khoa_id FROM kh)
     GROUP BY s.khoa_id
  )
  SELECT kh.khoa_id,
         p_chi_tieu,
         COALESCE(ph.n, 0),
         round(COALESCE(ph.n, 0) * 100.0 / p_chi_tieu, 1),
         COALESCE(ph.n, 0) >= p_chi_tieu
    FROM kh
    LEFT JOIN phien ph ON ph.khoa_id = kh.khoa_id
   ORDER BY kh.khoa_id;
END;
$$;

COMMENT ON FUNCTION public.fn_gstt_ke_hoach_tien_do(date, text, integer) IS
  'Tiến độ kế hoạch giám sát khoa/tháng: số phiên active trong tháng so với chỉ tiêu chung p_chi_tieu. Đạt khi so_phien >= chi_tieu. SECURITY INVOKER (theo RLS người gọi).';

REVOKE ALL ON FUNCTION public.fn_gstt_ke_hoach_tien_do(date, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_gstt_ke_hoach_tien_do(date, text, integer) TO authenticated, service_role;

-- CHƯA APPLY PROD — chờ PO.
-- SQL kiểm prod (chỉ đọc):
--   SELECT to_regclass('public.gstt_fact_ke_hoach_giam_sat') AS bang,
--          to_regprocedure('public.fn_gstt_ke_hoach_tien_do(date,text,integer)') AS rpc;
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'gstt_fact_ke_hoach_giam_sat';
--   SELECT ma_khoa, id FROM public.mdm_dm_khoa_phong WHERE id = public.fn_qlcv_ksnk_khoa_id();
