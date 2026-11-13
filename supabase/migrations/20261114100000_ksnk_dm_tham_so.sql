-- L2 (KH_APPKSNK_20261113): bảng tham số nghiệp vụ có hiệu lực theo ngày.
-- Đổi giá trị = THÊM dòng mới với hieu_luc_tu mới (không UPDATE/DELETE) → giữ được lịch sử.
-- Seed = đúng số đang viết cứng ở src/lib/analytics/supervision-thresholds.ts (không đổi hành vi).
CREATE TABLE IF NOT EXISTS public.ksnk_dm_tham_so (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_tham_so text NOT NULL CHECK (ma_tham_so ~ '^[a-z_]+\.[a-z_]+$'),
  gia_tri numeric NOT NULL,
  hieu_luc_tu date NOT NULL,
  nguon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL DEFAULT auth.uid(),
  CONSTRAINT uq_ksnk_dm_tham_so_ma_ngay UNIQUE (ma_tham_so, hieu_luc_tu)
);

COMMENT ON TABLE public.ksnk_dm_tham_so IS
  'Tham số nghiệp vụ (ngưỡng %, mẫu tối thiểu) theo ngày hiệu lực. Chỉ thêm dòng; giá trị áp dụng = dòng có hieu_luc_tu lớn nhất <= ngày xét.';

INSERT INTO public.ksnk_dm_tham_so (ma_tham_so, gia_tri, hieu_luc_tu, nguon) VALUES
  ('giam_sat.xanh_min_pct', 85, '2026-01-01', 'M01 R1.12 (XM-1 còn mở)'),
  ('giam_sat.vang_min_pct', 70, '2026-01-01', 'pilot, chờ N-GS-3'),
  ('giam_sat.khoa_canh_bao_pct', 80, '2026-01-01', 'pilot, chờ N-GS-3'),
  ('vst.khoa_vang_pct', 90, '2026-01-01', 'M01 R1.12 lộ trình 90'),
  ('vst.khoa_do_pct', 85, '2026-01-01', 'M01 R1.12'),
  ('vst.so_sanh_mau_toi_thieu', 20, '2026-01-01', 'pilot VST-07; M01 R1.14 nêu 100/tháng (XM-2 còn mở)'),
  ('doi_soat.vst_mau_toi_thieu', 20, '2026-01-01', 'pilot GS-07'),
  ('doi_soat.gsc_mau_toi_thieu', 30, '2026-01-01', 'pilot GS-07')
ON CONFLICT (ma_tham_so, hieu_luc_tu) DO NOTHING;

ALTER TABLE public.ksnk_dm_tham_so ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ksnk_dm_tham_so_select ON public.ksnk_dm_tham_so;
CREATE POLICY ksnk_dm_tham_so_select ON public.ksnk_dm_tham_so
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS ksnk_dm_tham_so_insert_admin ON public.ksnk_dm_tham_so;
CREATE POLICY ksnk_dm_tham_so_insert_admin ON public.ksnk_dm_tham_so
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_has_permission('QUAN_TRI_HE_THONG', 'edit') OR public.is_admin_user());

-- Supabase cấp sẵn ALL cho authenticated trên bảng mới → thu hết rồi cấp lại đúng SELECT, INSERT.
REVOKE ALL ON public.ksnk_dm_tham_so FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.ksnk_dm_tham_so TO authenticated;
GRANT SELECT, INSERT ON public.ksnk_dm_tham_so TO service_role;

-- Giá trị áp dụng tại một ngày; NULL khi chưa có dòng nào có hiệu lực.
CREATE OR REPLACE FUNCTION public.fn_ksnk_tham_so(p_ma text, p_ngay date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT t.gia_tri
  FROM public.ksnk_dm_tham_so t
  WHERE t.ma_tham_so = p_ma AND t.hieu_luc_tu <= p_ngay
  ORDER BY t.hieu_luc_tu DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_ksnk_tham_so(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_ksnk_tham_so(text, date) TO authenticated, service_role;
