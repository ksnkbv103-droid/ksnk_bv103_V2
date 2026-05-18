-- BV103: Chuẩn hóa FK trên bảng gốc (không đụng view v_*).
-- Mục tiêu: cột *_id phải REFERENCES đúng dm_* / mdm_* / fact_* — tránh nhập “trôi nổi”.

-- ---------------------------------------------------------------------------
-- A. Giám sát chung — kết quả checklist + phiên → bảng kiểm
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_orphan bigint;
BEGIN
  SELECT count(*) INTO v_orphan
  FROM public.fact_giam_sat_chung_results r
  WHERE r.criterion_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.dm_tieu_chi_bang_kiem tc WHERE tc.id = r.criterion_id
    );

  IF v_orphan = 0 THEN
    ALTER TABLE public.fact_giam_sat_chung_results
      ADD CONSTRAINT fk_gsc_results_criterion
      FOREIGN KEY (criterion_id) REFERENCES public.dm_tieu_chi_bang_kiem(id)
      ON DELETE RESTRICT;
  ELSE
    RAISE NOTICE
      'BV103: bỏ qua fk_gsc_results_criterion — % dòng criterion_id orphan (giữ dữ liệu, map tay sau).',
      v_orphan;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD COLUMN IF NOT EXISTS bang_kiem_id uuid;

DO $$
BEGIN
  ALTER TABLE public.fact_giam_sat_chung_sessions
    ADD CONSTRAINT fk_gsc_sessions_bang_kiem
    FOREIGN KEY (bang_kiem_id) REFERENCES public.dm_bang_kiem(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.fact_giam_sat_chung_sessions s
SET bang_kiem_id = bk.id
FROM public.dm_bang_kiem bk
WHERE s.bang_kiem_id IS NULL
  AND trim(coalesce(s.loai_bang_kiem, '')) <> ''
  AND (
    bk.ma_bk = trim(s.loai_bang_kiem)
    OR bk.id::text = trim(s.loai_bang_kiem)
  );

CREATE INDEX IF NOT EXISTS idx_gsc_results_criterion_id
  ON public.fact_giam_sat_chung_results (criterion_id);

CREATE INDEX IF NOT EXISTS idx_gsc_sessions_bang_kiem_id
  ON public.fact_giam_sat_chung_sessions (bang_kiem_id)
  WHERE bang_kiem_id IS NOT NULL;

COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.bang_kiem_id IS
  'FK dm_bang_kiem — SSOT; loai_bang_kiem giữ mã/legacy cho RPC dashboard.';

-- ---------------------------------------------------------------------------
-- B. CSSD sự cố — chi tiết → header
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.fact_su_co_chi_tiet
    ADD CONSTRAINT fk_su_co_chi_tiet_su_co
    FOREIGN KEY (su_co_id) REFERENCES public.fact_su_co(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- C. CSSD quy trình — nhân sự các bước trạm
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dang_giu
    FOREIGN KEY (nguoi_dang_giu_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiep_nhan
    FOREIGN KEY (nguoi_tiep_nhan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_lam_sach
    FOREIGN KEY (nguoi_lam_sach_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_kiem_tra
    FOREIGN KEY (nguoi_kiem_tra_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_dong_goi
    FOREIGN KEY (nguoi_dong_goi_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_tiet_khuan
    FOREIGN KEY (nguoi_tiet_khuan_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_quy_trinh
    ADD CONSTRAINT fk_quy_trinh_nguoi_cap_phat
    FOREIGN KEY (nguoi_cap_phat_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- D. CSSD mẻ / nhật ký / kho legacy
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_nguoi_van_hanh
    FOREIGN KEY (nguoi_van_hanh_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_nhat_ky_quet
    ADD CONSTRAINT fk_nhat_ky_quet_nguoi_thuc_hien
    FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_kho_giao_dich
    ADD CONSTRAINT fk_kho_giao_dich_nguoi_thuc_hien
    FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- E. Index FK hay join (bổ sung chỉ mục thiếu)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fact_quy_trinh_bo_dung_cu_id
  ON public.fact_quy_trinh (bo_dung_cu_id)
  WHERE bo_dung_cu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_vst_obs_khoa_id
  ON public.fact_giam_sat_vst (khoa_id)
  WHERE khoa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_vst_obs_nhan_vien_id
  ON public.fact_giam_sat_vst (nhan_vien_id)
  WHERE nhan_vien_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lo_tiet_khuan_thiet_bi_id
  ON public.fact_lo_tiet_khuan (thiet_bi_id)
  WHERE thiet_bi_id IS NOT NULL;
