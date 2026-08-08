-- NKBV BA timeline milestones — XQ/CT, triệu chứng, XN bổ sung trên bệnh án (không thay LIS).
-- Cổng vi sinh vẫn ghi nkbv_fact_vi_sinh; bảng này = mốc thủ công trên workspace BA.

CREATE TABLE IF NOT EXISTS public.nkbv_fact_ba_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_benh_an text NOT NULL REFERENCES public.nkbv_fact_benh_an (ma_benh_an) ON UPDATE CASCADE ON DELETE CASCADE,
  milestone_kind text NOT NULL,
  milestone_date date NOT NULL,
  title text NOT NULL,
  detail text,
  specimen_hint text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT nkbv_fact_ba_timeline_kind_chk CHECK (
    milestone_kind IN (
      'IMAGING_CHEST',
      'LAB_OTHER',
      'SYMPTOM',
      'PROCEDURE_SURGERY',
      'NOTE'
    )
  )
);

COMMENT ON TABLE public.nkbv_fact_ba_timeline IS
  'Mốc timeline bổ sung trên BA (XQ/CT, triệu chứng, XN khác, ngày mổ) — workspace BA-centric.';

CREATE INDEX IF NOT EXISTS idx_nkbv_ba_timeline_ma_ba_date
  ON public.nkbv_fact_ba_timeline (ma_benh_an, milestone_date)
  WHERE is_active = true;

ALTER TABLE public.nkbv_fact_ba_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nkbv_fact_ba_timeline_select ON public.nkbv_fact_ba_timeline;
DROP POLICY IF EXISTS nkbv_fact_ba_timeline_insert ON public.nkbv_fact_ba_timeline;
DROP POLICY IF EXISTS nkbv_fact_ba_timeline_update ON public.nkbv_fact_ba_timeline;
DROP POLICY IF EXISTS nkbv_fact_ba_timeline_delete ON public.nkbv_fact_ba_timeline;

CREATE POLICY nkbv_fact_ba_timeline_select ON public.nkbv_fact_ba_timeline
  FOR SELECT TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'view'));
CREATE POLICY nkbv_fact_ba_timeline_insert ON public.nkbv_fact_ba_timeline
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'create'));
CREATE POLICY nkbv_fact_ba_timeline_update ON public.nkbv_fact_ba_timeline
  FOR UPDATE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'))
  WITH CHECK (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'edit'));
CREATE POLICY nkbv_fact_ba_timeline_delete ON public.nkbv_fact_ba_timeline
  FOR DELETE TO authenticated
  USING (public.fn_sys_is_admin() OR public.fn_sys_has_permission('GIAM_SAT_NKBV', 'delete'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nkbv_fact_ba_timeline TO authenticated;
GRANT ALL ON public.nkbv_fact_ba_timeline TO service_role;
