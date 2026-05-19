-- BV103: Bảo toàn dữ liệu VST import cũ — thêm FK trên dòng quan sát, backfill, KHÔNG xóa cột text.
-- Nguyên tắc: (1) không DROP cột; (2) không UPDATE ghi đè text đã có; (3) chỉ bổ sung *_id và điền text trống từ danh mục.

-- Chuẩn hóa nhãn so khớp (unaccent + đ→d + gộp khoảng trắng)
CREATE OR REPLACE FUNCTION public.bv103_norm_label(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT trim(
    regexp_replace(
      translate(lower(public.unaccent(coalesce(p, ''))), 'đ', 'd'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

COMMENT ON FUNCTION public.bv103_norm_label(text) IS
  'Chuẩn hóa nhãn tiếng Việt để backfill FK từ dữ liệu text legacy (VST/GSC).';

-- ---------------------------------------------------------------------------
-- A. fact_giam_sat_vst — cột FK mới (nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_giam_sat_vst
  ADD COLUMN IF NOT EXISTS khu_vuc_id uuid,
  ADD COLUMN IF NOT EXISTS nghe_nghiep_id uuid;

COMMENT ON COLUMN public.fact_giam_sat_vst.khu_vuc_id IS
  'FK dm_khu_vuc_giam_sat — SSOT; cột khu_vuc (text) giữ nhãn legacy / denorm.';
COMMENT ON COLUMN public.fact_giam_sat_vst.nghe_nghiep_id IS
  'FK dm_nghe_nghiep — SSOT; cột nghe_nghiep (text) giữ nhãn legacy / denorm.';

-- ---------------------------------------------------------------------------
-- B. Backfill khu_vuc_id (ưu tiên phiên → text → uuid literal)
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = s.khu_vuc_id
FROM public.fact_giam_sat_vst_sessions s
WHERE o.session_id = s.id
  AND o.khu_vuc_id IS NULL
  AND s.khu_vuc_id IS NOT NULL;

UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = kv.id
FROM public.dm_khu_vuc_giam_sat kv
WHERE o.khu_vuc_id IS NULL
  AND public.bv103_norm_label(o.khu_vuc) <> ''
  AND public.bv103_norm_label(o.khu_vuc) = public.bv103_norm_label(kv.ten_khu_vuc);

UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = kv.id
FROM public.dm_khu_vuc_giam_sat kv
WHERE o.khu_vuc_id IS NULL
  AND public.bv103_norm_label(o.khu_vuc) <> ''
  AND public.bv103_norm_label(o.khu_vuc) = public.bv103_norm_label(kv.ma_khu_vuc);

UPDATE public.fact_giam_sat_vst o
SET khu_vuc_id = kv.id
FROM public.dm_khu_vuc_giam_sat kv
WHERE o.khu_vuc_id IS NULL
  AND trim(coalesce(o.khu_vuc, '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND kv.id::text = trim(o.khu_vuc);

-- Phiên chưa có khu_vuc_id: lấy khu_vuc_id phổ biến nhất từ dòng con (legacy import)
UPDATE public.fact_giam_sat_vst_sessions s
SET khu_vuc_id = picked.khu_vuc_id
FROM (
  SELECT DISTINCT ON (t.session_id)
    t.session_id,
    t.khu_vuc_id
  FROM (
    SELECT o.session_id, o.khu_vuc_id, count(*) AS cnt
    FROM public.fact_giam_sat_vst o
    WHERE o.khu_vuc_id IS NOT NULL
    GROUP BY o.session_id, o.khu_vuc_id
  ) t
  ORDER BY t.session_id, t.cnt DESC, t.khu_vuc_id
) picked
WHERE s.id = picked.session_id
  AND s.khu_vuc_id IS NULL;

-- ---------------------------------------------------------------------------
-- C. Backfill nghe_nghiep_id (nhân sự → text → mã)
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep_id = ns.nghe_nghiep_id
FROM public.mdm_nhan_su ns
WHERE o.nghe_nghiep_id IS NULL
  AND o.nhan_vien_id IS NOT NULL
  AND ns.id = o.nhan_vien_id
  AND ns.nghe_nghiep_id IS NOT NULL;

UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep_id = nn.id
FROM public.dm_nghe_nghiep nn
WHERE o.nghe_nghiep_id IS NULL
  AND public.bv103_norm_label(o.nghe_nghiep) <> ''
  AND public.bv103_norm_label(o.nghe_nghiep) = public.bv103_norm_label(nn.ten_nghe_nghiep);

UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep_id = nn.id
FROM public.dm_nghe_nghiep nn
WHERE o.nghe_nghiep_id IS NULL
  AND public.bv103_norm_label(o.nghe_nghiep) <> ''
  AND public.bv103_norm_label(o.nghe_nghiep) = public.bv103_norm_label(nn.ma_nghe_nghiep);

UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep_id = nn.id
FROM public.dm_nghe_nghiep nn
WHERE o.nghe_nghiep_id IS NULL
  AND trim(coalesce(o.nghe_nghiep, '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND nn.id::text = trim(o.nghe_nghiep);

-- ---------------------------------------------------------------------------
-- D. Bổ sung text / vi_tri TRỐNG — không ghi đè giá trị legacy đã có
-- ---------------------------------------------------------------------------
UPDATE public.fact_giam_sat_vst o
SET khu_vuc = kv.ten_khu_vuc
FROM public.dm_khu_vuc_giam_sat kv
WHERE o.khu_vuc_id = kv.id
  AND trim(coalesce(o.khu_vuc, '')) = '';

UPDATE public.fact_giam_sat_vst o
SET nghe_nghiep = nn.ten_nghe_nghiep
FROM public.dm_nghe_nghiep nn
WHERE o.nghe_nghiep_id = nn.id
  AND trim(coalesce(o.nghe_nghiep, '')) = '';

UPDATE public.fact_giam_sat_vst o
SET vi_tri = s.vi_tri_cu_the
FROM public.fact_giam_sat_vst_sessions s
WHERE o.session_id = s.id
  AND trim(coalesce(o.vi_tri, '')) = ''
  AND trim(coalesce(s.vi_tri_cu_the, '')) <> '';

-- Phiên: đồng bộ vi_tri_cu_the từ dòng nếu phiên trống (legacy)
UPDATE public.fact_giam_sat_vst_sessions s
SET vi_tri_cu_the = sub.vi_tri
FROM (
  SELECT DISTINCT ON (o.session_id)
    o.session_id,
    o.vi_tri
  FROM public.fact_giam_sat_vst o
  WHERE trim(coalesce(o.vi_tri, '')) <> ''
  ORDER BY o.session_id, o.created_at DESC NULLS LAST
) sub
WHERE s.id = sub.session_id
  AND trim(coalesce(s.vi_tri_cu_the, '')) = '';

-- Phiên: hinh_thuc / cach_thuc — backfill bổ sung unaccent (16007 chỉ trim exact)
UPDATE public.fact_giam_sat_vst_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id IS NULL
  AND public.bv103_norm_label(s.hinh_thuc_giam_sat) <> ''
  AND public.bv103_norm_label(s.hinh_thuc_giam_sat) = public.bv103_norm_label(dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_vst_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id IS NULL
  AND public.bv103_norm_label(s.cach_thuc_giam_sat) <> ''
  AND public.bv103_norm_label(s.cach_thuc_giam_sat) = public.bv103_norm_label(dm.ten_cach_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET hinh_thuc_id = dm.id
FROM public.dm_hinh_thuc_giam_sat dm
WHERE s.hinh_thuc_id IS NULL
  AND public.bv103_norm_label(s.hinh_thuc_giam_sat) <> ''
  AND public.bv103_norm_label(s.hinh_thuc_giam_sat) = public.bv103_norm_label(dm.ten_hinh_thuc);

UPDATE public.fact_giam_sat_chung_sessions s
SET cach_thuc_id = dm.id
FROM public.dm_cach_thuc_giam_sat dm
WHERE s.cach_thuc_id IS NULL
  AND public.bv103_norm_label(s.cach_thuc_giam_sat) <> ''
  AND public.bv103_norm_label(s.cach_thuc_giam_sat) = public.bv103_norm_label(dm.ten_cach_thuc);

-- ---------------------------------------------------------------------------
-- E. GSC criterion — sửa orphan trước FK 16008 (không xóa hàng)
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

  IF v_orphan > 0 THEN
    RAISE NOTICE
      'BV103: % dòng fact_giam_sat_chung_results có criterion_id orphan — giữ nguyên; cần map tay trước khi FK 16008.',
      v_orphan;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- F. FK (chỉ khi giá trị hợp lệ hoặc NULL)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.fact_giam_sat_vst
    ADD CONSTRAINT fk_vst_obs_khu_vuc
    FOREIGN KEY (khu_vuc_id) REFERENCES public.dm_khu_vuc_giam_sat(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_giam_sat_vst
    ADD CONSTRAINT fk_vst_obs_nghe_nghiep
    FOREIGN KEY (nghe_nghiep_id) REFERENCES public.dm_nghe_nghiep(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_vst_obs_khu_vuc_id
  ON public.fact_giam_sat_vst (khu_vuc_id)
  WHERE khu_vuc_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_vst_obs_nghe_nghiep_id
  ON public.fact_giam_sat_vst (nghe_nghiep_id)
  WHERE nghe_nghiep_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- G. View đọc dòng VST — COALESCE tên danh mục, giữ text gốc
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_fact_giam_sat_vst_full CASCADE;

CREATE VIEW public.v_fact_giam_sat_vst_full
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.session_id,
  o.nhan_vien_id,
  o.ten_nhan_vien_ngoai,
  o.khoa_id,
  o.khu_vuc_id,
  o.nghe_nghiep_id,
  o.khu_vuc AS khu_vuc_text_legacy,
  o.vi_tri,
  o.nghe_nghiep AS nghe_nghiep_text_legacy,
  COALESCE(kv.ten_khu_vuc, NULLIF(trim(o.khu_vuc), '')) AS ten_khu_vuc_hien_thi,
  COALESCE(nn.ten_nghe_nghiep, NULLIF(trim(o.nghe_nghiep), '')) AS ten_nghe_nghiep_hien_thi,
  kv.ma_khu_vuc AS ma_khu_vuc_giam_sat,
  nn.ma_nghe_nghiep,
  k.ten_khoa AS ten_khoa_phong,
  o.ngay_giam_sat,
  o.thoi_diem,
  o.hanh_dong,
  o.dung_ky_thuat,
  o.du_thoi_gian,
  o.co_deo_gang,
  o.thoi_gian_ghi_nhan,
  o.legacy_csv_row_id,
  o.ghi_chu,
  o.created_at
FROM public.fact_giam_sat_vst o
LEFT JOIN public.dm_khu_vuc_giam_sat kv ON kv.id = o.khu_vuc_id
LEFT JOIN public.dm_nghe_nghiep nn ON nn.id = o.nghe_nghiep_id
LEFT JOIN public.dm_khoa_phong k ON k.id = o.khoa_id;

GRANT SELECT ON public.v_fact_giam_sat_vst_full TO authenticated, service_role;
