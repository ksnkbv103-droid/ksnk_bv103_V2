-- Nháp phiên phân tích BA (lớp việc đang làm) — không phải bảng tổng hợp tỷ lệ.
-- Một dòng = một Index + chế độ CDC|MANUAL trên một bệnh án.

CREATE TABLE IF NOT EXISTS public.nkbv_fact_ba_phan_tich (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL REFERENCES public.nkbv_fact_benh_an (ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE,
  session_id text NOT NULL,
  analysis_mode text NOT NULL DEFAULT 'CDC',
  panel text NOT NULL,
  index_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  index_label text NOT NULL DEFAULT '',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT nkbv_fact_ba_phan_tich_mode_chk CHECK (analysis_mode IN ('CDC', 'MANUAL'))
);

COMMENT ON TABLE public.nkbv_fact_ba_phan_tich IS
  'Nháp phiên phân tích Hub BA — sống tới khi Tạo phiếu / Bỏ qua / xóa phiên.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_nkbv_ba_phan_tich_ba_session_mode
  ON public.nkbv_fact_ba_phan_tich (ma_benh_an, session_id, analysis_mode)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nkbv_ba_phan_tich_ma_ba
  ON public.nkbv_fact_ba_phan_tich (ma_benh_an)
  WHERE is_active = true;

ALTER TABLE public.nkbv_fact_ba_phan_tich ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_ba_phan_tich_select ON public.nkbv_fact_ba_phan_tich;
DROP POLICY IF EXISTS nkbv_fact_ba_phan_tich_insert ON public.nkbv_fact_ba_phan_tich;
DROP POLICY IF EXISTS nkbv_fact_ba_phan_tich_update ON public.nkbv_fact_ba_phan_tich;
DROP POLICY IF EXISTS nkbv_fact_ba_phan_tich_delete ON public.nkbv_fact_ba_phan_tich;

CREATE POLICY nkbv_fact_ba_phan_tich_select ON public.nkbv_fact_ba_phan_tich
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_ba_phan_tich_insert ON public.nkbv_fact_ba_phan_tich
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create')
    OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_ba_phan_tich_update ON public.nkbv_fact_ba_phan_tich
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_ba_phan_tich_delete ON public.nkbv_fact_ba_phan_tich
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_ba_phan_tich TO authenticated;
GRANT ALL ON public.nkbv_fact_ba_phan_tich TO service_role;
