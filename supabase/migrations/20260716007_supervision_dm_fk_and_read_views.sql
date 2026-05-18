-- Chuẩn hóa link danh mục giám sát (VST/GSC) + view đọc có tên.
-- SSOT: hinh_thuc_id / cach_thuc_id → dm_*; cột text giữ đồng bộ để legacy/dashboard.

-- ---------------------------------------------------------------------------
-- 1) FK cột trên phiên (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_giam_sat_vst_sessions
  ADD COLUMN IF NOT EXISTS hinh_thuc_id uuid REFERENCES public.dm_hinh_thuc_giam_sat(id),
  ADD COLUMN IF NOT EXISTS cach_thuc_id uuid REFERENCES public.dm_cach_thuc_giam_sat(id);

ALTER TABLE public.fact_giam_sat_chung_sessions
  ADD COLUMN IF NOT EXISTS hinh_thuc_id uuid REFERENCES public.dm_hinh_thuc_giam_sat(id),
  ADD COLUMN IF NOT EXISTS cach_thuc_id uuid REFERENCES public.dm_cach_thuc_giam_sat(id);

COMMENT ON COLUMN public.fact_giam_sat_vst_sessions.hinh_thuc_id IS
  'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';
COMMENT ON COLUMN public.fact_giam_sat_vst_sessions.cach_thuc_id IS
  'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.hinh_thuc_id IS
  'FK dm_hinh_thuc_giam_sat — link chuẩn; hinh_thuc_giam_sat là nhãn đồng bộ.';
COMMENT ON COLUMN public.fact_giam_sat_chung_sessions.cach_thuc_id IS
  'FK dm_cach_thuc_giam_sat — link chuẩn; cach_thuc_giam_sat là nhãn đồng bộ.';

-- ---------------------------------------------------------------------------
-- 2) Backfill *_id từ text (dữ liệu cũ)
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id IS NULL
  AND trim(coalesce(s.hinh_thuc_giam_sat, '')) <> ''
  AND trim(s.hinh_thuc_giam_sat) = trim(dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_vst_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id IS NULL
  AND trim(coalesce(s.cach_thuc_giam_sat, '')) <> ''
  AND trim(s.cach_thuc_giam_sat) = trim(dm.ten_cach_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id IS NULL
  AND trim(coalesce(s.hinh_thuc_giam_sat, '')) <> ''
  AND trim(s.hinh_thuc_giam_sat) = trim(dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id IS NULL
  AND trim(coalesce(s.cach_thuc_giam_sat, '')) <> ''
  AND trim(s.cach_thuc_giam_sat) = trim(dm.ten_cach_thuc);

-- ---------------------------------------------------------------------------
-- 3) Đồng bộ nhãn text từ danh mục khi đã có *_id
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst_sessions s
SET hinh_thuc_giam_sat = dm.ten_hinh_thuc
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id = dm.id
  AND (s.hinh_thuc_giam_sat IS DISTINCT FROM dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_vst_sessions s
SET cach_thuc_giam_sat = dm.ten_cach_thuc
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id = dm.id
  AND (s.cach_thuc_giam_sat IS DISTINCT FROM dm.ten_cach_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET hinh_thuc_giam_sat = dm.ten_hinh_thuc
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id = dm.id
  AND (s.hinh_thuc_giam_sat IS DISTINCT FROM dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET cach_thuc_giam_sat = dm.ten_cach_thuc
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id = dm.id
  AND (s.cach_thuc_giam_sat IS DISTINCT FROM dm.ten_cach_thuc);

-- ---------------------------------------------------------------------------
-- 4) Index FK (tra cứu / join view)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fact_vst_sessions_hinh_thuc_id
  ON public.fact_giam_sat_vst_sessions (hinh_thuc_id)
  WHERE hinh_thuc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_vst_sessions_cach_thuc_id
  ON public.fact_giam_sat_vst_sessions (cach_thuc_id)
  WHERE cach_thuc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_gsc_sessions_hinh_thuc_id
  ON public.fact_giam_sat_chung_sessions (hinh_thuc_id)
  WHERE hinh_thuc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_gsc_sessions_cach_thuc_id
  ON public.fact_giam_sat_chung_sessions (cach_thuc_id)
  WHERE cach_thuc_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5) View phiên VST — join đủ dm_* / mdm_* (đọc DB trực quan)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_vst_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.khoa_id,
  s.khu_vuc_id,
  s.vi_tri_cu_the,
  s.hinh_thuc_id,
  s.cach_thuc_id,
  s.hinh_thuc_giam_sat,
  s.cach_thuc_giam_sat,
  s.nguoi_giam_sat_id,
  s.thoi_gian_bat_dau,
  s.thoi_gian_ket_thuc,
  s.ngay_giam_sat,
  s.created_at,
  s.updated_at,
  s.is_active,
  s.is_seen,
  k.ma_khoa AS ma_khoa_phong,
  k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns.ho_ten AS ten_nguoi_giam_sat,
  ns.ma_nv AS ma_nguoi_giam_sat,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  COALESCE(ht.ten_hinh_thuc, s.hinh_thuc_giam_sat) AS ten_hinh_thuc_danh_muc,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  COALESCE(ct.ten_cach_thuc, s.cach_thuc_giam_sat) AS ten_cach_thuc_danh_muc,
  (
    SELECT count(*)::bigint
    FROM public.fact_giam_sat_vst o
    WHERE o.session_id = s.id
  ) AS tong_co_hoi,
  (
    SELECT count(*)::bigint
    FROM public.fact_giam_sat_vst o
    WHERE o.session_id = s.id
      AND (
        lower(public.unaccent(o.hanh_dong)) = 'rua tay bang nuoc'
        OR lower(public.unaccent(o.hanh_dong)) = 'cha tay bang con'
      )
  ) AS da_tuan_thu
FROM public.fact_giam_sat_vst_sessions s
LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns ON ns.id = s.nguoi_giam_sat_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
WHERE s.is_active = true;

GRANT SELECT ON public.v_fact_giam_sat_vst_sessions_full TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) View phiên GSC — khôi phục join hình thức / cách thức + giữ join hiện có
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_fact_giam_sat_chung_sessions_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_chung_sessions_full
WITH (security_invoker = true) AS
SELECT
  s.*,
  k.ma_khoa AS ma_khoa_phong,
  k.ten_khoa AS ten_khoa_phong,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  kv.ten_khu_vuc AS ten_khu_vuc_giam_sat,
  ns_gs.ho_ten AS ten_nguoi_giam_sat,
  ns_gs.ma_nv AS ma_nguoi_giam_sat,
  ns_nv.ho_ten AS ten_nhan_vien,
  ns_nv.ma_nv AS ma_nhan_vien,
  nn.ma_nghe_nghiep AS ma_nghe_nghiep,
  nn.ten_nghe_nghiep AS ten_nghe_nghiep,
  ht.ma_hinh_thuc AS ma_hinh_thuc_giam_sat,
  COALESCE(ht.ten_hinh_thuc, s.hinh_thuc_giam_sat) AS ten_hinh_thuc_danh_muc,
  ct.ma_cach_thuc AS ma_cach_thuc_giam_sat,
  COALESCE(ct.ten_cach_thuc, s.cach_thuc_giam_sat) AS ten_cach_thuc_danh_muc,
  bk.ten_bang_kiem AS ten_bang_kiem_hien_thi
FROM public.fact_giam_sat_chung_sessions s
LEFT JOIN public.dm_khoa_phong k ON k.id = s.khoa_id
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = s.khu_vuc_id
LEFT JOIN public.mdm_nhan_su ns_gs ON ns_gs.id = s.nguoi_giam_sat_id
LEFT JOIN public.mdm_nhan_su ns_nv ON ns_nv.id = s.nhan_vien_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = s.nghe_nghiep_id
LEFT JOIN public.dm_hinh_thuc_giam_sat ht ON ht.id = s.hinh_thuc_id
LEFT JOIN public.dm_cach_thuc_giam_sat ct ON ct.id = s.cach_thuc_id
LEFT JOIN public.dm_bang_kiem bk
  ON (
    bk.ma_bk = trim(both FROM coalesce(s.loai_bang_kiem, ''))
    OR bk.id::text = trim(both FROM coalesce(s.loai_bang_kiem, ''))
  )
  AND coalesce(bk.is_active, true) = true;

GRANT SELECT ON public.v_fact_giam_sat_chung_sessions_full TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) View danh mục dm_* — đọc FK kèm tên (tra cứu Table Editor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_full
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.ma_bo,
  b.ten_bo,
  b.loai_dung_cu_id,
  l.ma_loai AS ma_loai_dung_cu,
  l.ten_loai AS ten_loai_dung_cu,
  b.khoa_su_dung_id,
  k.ma_khoa AS ma_khoa_su_dung,
  k.ten_khoa AS ten_khoa_su_dung,
  b.trang_thai,
  b.quy_cach,
  b.ghi_chu,
  b.ngay_kiem_ke_gan_nhat,
  b.is_active,
  b.created_at,
  b.updated_at
FROM public.dm_bo_dung_cu b
LEFT JOIN public.dm_loai_dung_cu l ON l.id = b.loai_dung_cu_id
LEFT JOIN public.dm_khoa_phong k ON k.id = b.khoa_su_dung_id;

CREATE OR REPLACE VIEW public.v_dm_bo_dung_cu_chi_tiet_full
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.bo_dung_cu_id,
  b.ma_bo AS ma_bo,
  b.ten_bo AS ten_bo,
  c.loai_dung_cu_id,
  l.ma_loai AS ma_loai_dung_cu,
  l.ten_loai AS ten_loai_dung_cu,
  c.ma_chi_tiet,
  c.ten_chi_tiet,
  c.ten_dung_cu_le,
  c.so_luong,
  c.ma_qr_mau,
  c.is_active,
  c.created_at,
  c.updated_at
FROM public.dm_bo_dung_cu_chi_tiet c
LEFT JOIN public.dm_bo_dung_cu b ON b.id = c.bo_dung_cu_id
LEFT JOIN public.dm_loai_dung_cu l ON l.id = c.loai_dung_cu_id;

CREATE OR REPLACE VIEW public.v_dm_tieu_chi_bang_kiem_full
WITH (security_invoker = true) AS
SELECT
  tc.id,
  tc.bang_kiem_id,
  bk.ma_bk AS ma_bang_kiem,
  bk.ten_bang_kiem AS ten_bang_kiem,
  tc.noi_dung,
  tc.stt,
  tc.diem_toi_da,
  tc.is_active,
  tc.created_at,
  tc.updated_at
FROM public.dm_tieu_chi_bang_kiem tc
LEFT JOIN public.dm_bang_kiem bk ON bk.id = tc.bang_kiem_id;

GRANT SELECT ON public.v_dm_bo_dung_cu_full TO authenticated, service_role;
GRANT SELECT ON public.v_dm_bo_dung_cu_chi_tiet_full TO authenticated, service_role;
GRANT SELECT ON public.v_dm_tieu_chi_bang_kiem_full TO authenticated, service_role;
