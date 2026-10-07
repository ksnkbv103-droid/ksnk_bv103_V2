-- Soft Soft Soft-safe 25b M-04 — thin catalog chương trình **theo máy** (Domain A).
-- KHÔNG seed catalog viện (park invent). MDM/ops điền sau.
-- Tip FE: specs.chuong_trinh_catalog hoặc QT21 HD.03 theo PP khi bảng trống.
-- Không APPLY prod trong beat Soft Soft Soft-local trừ khi Lead bảo.

CREATE TABLE IF NOT EXISTS public.cssd_dm_chuong_trinh_may (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thiet_bi_id uuid NOT NULL REFERENCES public.cssd_dm_thiet_bi(id) ON DELETE CASCADE,
  ma_chuong_trinh text NOT NULL,
  ten_chuong_trinh text NOT NULL,
  nhiet_do_chuan text,
  ap_suat_chuan text,
  thoi_gian_chuan text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  nguon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cssd_dm_chuong_trinh_may_ma_len CHECK (char_length(btrim(ma_chuong_trinh)) BETWEEN 1 AND 40),
  CONSTRAINT cssd_dm_chuong_trinh_may_ten_len CHECK (char_length(btrim(ten_chuong_trinh)) BETWEEN 1 AND 80)
);

COMMENT ON TABLE public.cssd_dm_chuong_trinh_may IS
  'M-04 thin: chương trình theo máy (mã/tên + thông số chuẩn). Không seed viện — QT21 HD.03 dùng làm fallback FE khi trống.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cssd_dm_chuong_trinh_may_tb_ma
  ON public.cssd_dm_chuong_trinh_may (thiet_bi_id, lower(btrim(ma_chuong_trinh)))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_cssd_dm_chuong_trinh_may_tb
  ON public.cssd_dm_chuong_trinh_may (thiet_bi_id)
  WHERE is_active = true;

ALTER TABLE public.cssd_dm_chuong_trinh_may ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cssd_dm_chuong_trinh_may_select ON public.cssd_dm_chuong_trinh_may;
CREATE POLICY cssd_dm_chuong_trinh_may_select
  ON public.cssd_dm_chuong_trinh_may
  FOR SELECT TO authenticated
  USING (public.fn_sys_has_permission('THIET_BI'::text, 'view'::text)
      OR public.fn_sys_has_permission('CSSD'::text, 'view'::text));

DROP POLICY IF EXISTS cssd_dm_chuong_trinh_may_write ON public.cssd_dm_chuong_trinh_may;
CREATE POLICY cssd_dm_chuong_trinh_may_write
  ON public.cssd_dm_chuong_trinh_may
  FOR ALL TO authenticated
  USING (public.fn_sys_has_permission('THIET_BI'::text, 'edit'::text))
  WITH CHECK (public.fn_sys_has_permission('THIET_BI'::text, 'edit'::text));

GRANT SELECT ON public.cssd_dm_chuong_trinh_may TO authenticated;
GRANT ALL ON public.cssd_dm_chuong_trinh_may TO service_role;
