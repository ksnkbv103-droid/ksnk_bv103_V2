-- Cải tổ Đào tạo: 8 bảng → 3 bảng (cau_hoi · cau_hinh · lan_thi).
-- An toàn: backfill trước, DROP sau; giữ id phương án trong JSONB để chấm điểm không lệch.

-- ─── 1) Mở rộng dao_tao_cau_hoi ─────────────────────────────────────────────
ALTER TABLE public.dao_tao_cau_hoi
  ADD COLUMN IF NOT EXISTS chu_de_ma text,
  ADD COLUMN IF NOT EXISTS chu_de_ten text,
  ADD COLUMN IF NOT EXISTS phuong_an jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.dao_tao_cau_hoi q
SET
  chu_de_ma = COALESCE(cd.ma, 'SSI_TRUOC_MO'),
  chu_de_ten = COALESCE(cd.ten, 'Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)')
FROM public.dao_tao_chu_de cd
WHERE q.chu_de_id = cd.id
  AND (q.chu_de_ma IS NULL OR q.chu_de_ten IS NULL);

UPDATE public.dao_tao_cau_hoi
SET chu_de_ma = 'SSI_TRUOC_MO',
    chu_de_ten = 'Phòng ngừa nhiễm khuẩn vết mổ (trước mổ)'
WHERE chu_de_ma IS NULL;

-- Nhúng phương án (giữ nguyên id để dap_an_dung vẫn khớp).
UPDATE public.dao_tao_cau_hoi q
SET phuong_an = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pa.id,
      'nhan_goc', pa.nhan_goc,
      'noi_dung', pa.noi_dung,
      'thu_tu_goc', pa.thu_tu_goc,
      'tf_dung', pa.tf_dung
    )
    ORDER BY pa.thu_tu_goc, pa.nhan_goc
  )
  FROM public.dao_tao_phuong_an pa
  WHERE pa.cau_hoi_id = q.id
), '[]'::jsonb)
WHERE COALESCE(jsonb_array_length(q.phuong_an), 0) = 0
   OR q.phuong_an = '[]'::jsonb;

ALTER TABLE public.dao_tao_cau_hoi
  ALTER COLUMN chu_de_ma SET NOT NULL,
  ALTER COLUMN chu_de_ten SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dao_tao_cau_hoi_chu_de_ma_active
  ON public.dao_tao_cau_hoi (chu_de_ma) WHERE is_active;

-- ─── 2) Tạo dao_tao_cau_hinh (gộp muc_do + ky_thi + gan) ────────────────────
CREATE TABLE IF NOT EXISTS public.dao_tao_cau_hinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loai_cau_hinh text NOT NULL CHECK (loai_cau_hinh IN ('thi_thu_muc_do', 'thi_that')),
  ma text,
  ten text NOT NULL,
  mo_ta text,
  so_cau integer NOT NULL CHECK (so_cau > 0),
  thoi_gian_phut integer NOT NULL CHECK (thoi_gian_phut > 0),
  diem_dat_pct numeric(5,1) CHECK (diem_dat_pct IS NULL OR (diem_dat_pct >= 0 AND diem_dat_pct <= 100)),
  bloom_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  loai_quota jsonb NOT NULL DEFAULT '{}'::jsonb,
  chu_de_mas text[] NOT NULL DEFAULT '{}',
  gan jsonb NOT NULL DEFAULT '{"khoa_ids":[],"nhan_su_ids":[]}'::jsonb,
  shuffle_cau boolean NOT NULL DEFAULT true,
  shuffle_dap_an boolean NOT NULL DEFAULT true,
  so_lan_cho_phep integer NOT NULL DEFAULT 1 CHECK (so_lan_cho_phep >= 1),
  trang_thai text NOT NULL DEFAULT 'published'
    CHECK (trang_thai IN ('draft', 'published', 'closed')),
  thu_tu smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dao_tao_cau_hinh_ma_chk CHECK (
    loai_cau_hinh <> 'thi_thu_muc_do' OR ma IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dao_tao_cau_hinh_muc_do_ma
  ON public.dao_tao_cau_hinh (ma)
  WHERE loai_cau_hinh = 'thi_thu_muc_do' AND ma IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dao_tao_cau_hinh_loai_tt
  ON public.dao_tao_cau_hinh (loai_cau_hinh, trang_thai)
  WHERE is_active;

-- Migrate mức độ thi thử
INSERT INTO public.dao_tao_cau_hinh (
  id, loai_cau_hinh, ma, ten, so_cau, thoi_gian_phut, bloom_quota, loai_quota,
  thu_tu, is_active, trang_thai, created_at, updated_at
)
SELECT
  m.id,
  'thi_thu_muc_do',
  m.ma,
  m.ten,
  m.so_cau,
  m.thoi_gian_phut,
  COALESCE(m.bloom_quota, '{}'::jsonb),
  COALESCE(m.loai_quota, '{}'::jsonb),
  m.thu_tu,
  m.is_active,
  'published',
  m.created_at,
  m.updated_at
FROM public.dao_tao_muc_do_thi_thu m
ON CONFLICT DO NOTHING;

-- Fallback seed nếu bảng muc_do đã trống / chưa migrate
INSERT INTO public.dao_tao_cau_hinh (loai_cau_hinh, ma, ten, so_cau, thoi_gian_phut, bloom_quota, loai_quota, thu_tu)
SELECT v.loai, v.ma, v.ten, v.so_cau, v.phut, v.bloom::jsonb, v.loaiq::jsonb, v.thu_tu
FROM (VALUES
  ('thi_thu_muc_do', 'co_ban', 'Cơ bản', 10, 15,
   '{"1":0.40,"2":0.40,"3":0.20,"4":0,"5":0}',
   '{"single":0.55,"multi":0.20,"true_false_cluster":0.15,"order":0.10}', 1),
  ('thi_thu_muc_do', 'trung_binh', 'Trung bình', 20, 25,
   '{"1":0.25,"2":0.30,"3":0.30,"4":0.15,"5":0}',
   '{"single":0.50,"multi":0.20,"true_false_cluster":0.15,"order":0.15}', 2),
  ('thi_thu_muc_do', 'nang_cao', 'Nâng cao', 40, 45,
   '{"1":0.10,"2":0.20,"3":0.35,"4":0.25,"5":0.10}',
   '{"single":0.45,"multi":0.20,"true_false_cluster":0.20,"order":0.15}', 3)
) AS v(loai, ma, ten, so_cau, phut, bloom, loaiq, thu_tu)
WHERE NOT EXISTS (
  SELECT 1 FROM public.dao_tao_cau_hinh c
  WHERE c.loai_cau_hinh = 'thi_thu_muc_do' AND c.ma = v.ma
);

-- Migrate kỳ thi thật + gán
INSERT INTO public.dao_tao_cau_hinh (
  id, loai_cau_hinh, ten, mo_ta, so_cau, thoi_gian_phut, diem_dat_pct,
  bloom_quota, loai_quota, chu_de_mas, gan, shuffle_cau, shuffle_dap_an,
  so_lan_cho_phep, trang_thai, created_by, created_at, updated_at
)
SELECT
  k.id,
  'thi_that',
  k.ten,
  k.mo_ta,
  k.so_cau,
  k.thoi_gian_phut,
  k.diem_dat_pct,
  COALESCE(k.bloom_quota, '{}'::jsonb),
  COALESCE(k.loai_quota, '{}'::jsonb),
  COALESCE((
    SELECT array_agg(DISTINCT cd.ma)
    FROM unnest(COALESCE(k.chu_de_ids, '{}'::uuid[])) AS uid
    JOIN public.dao_tao_chu_de cd ON cd.id = uid
  ), '{}'::text[]),
  jsonb_build_object(
    'khoa_ids', COALESCE((
      SELECT jsonb_agg(g.khoa_phong_id) FILTER (WHERE g.khoa_phong_id IS NOT NULL)
      FROM public.dao_tao_ky_thi_gan g WHERE g.ky_thi_id = k.id
    ), '[]'::jsonb),
    'nhan_su_ids', COALESCE((
      SELECT jsonb_agg(g.nhan_su_id) FILTER (WHERE g.nhan_su_id IS NOT NULL)
      FROM public.dao_tao_ky_thi_gan g WHERE g.ky_thi_id = k.id
    ), '[]'::jsonb)
  ),
  k.shuffle_cau,
  k.shuffle_dap_an,
  k.so_lan_cho_phep,
  k.trang_thai,
  k.created_by,
  k.created_at,
  k.updated_at
FROM public.dao_tao_ky_thi k
WHERE k.che_do = 'thi_that'
  AND NOT EXISTS (SELECT 1 FROM public.dao_tao_cau_hinh c WHERE c.id = k.id);

-- ─── 3) Mở rộng dao_tao_lan_thi ─────────────────────────────────────────────
ALTER TABLE public.dao_tao_lan_thi
  ADD COLUMN IF NOT EXISTS cau_hinh_id uuid REFERENCES public.dao_tao_cau_hinh(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS de_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Map FK cũ → cau_hinh_id
UPDATE public.dao_tao_lan_thi
SET cau_hinh_id = muc_do_id
WHERE cau_hinh_id IS NULL AND muc_do_id IS NOT NULL;

UPDATE public.dao_tao_lan_thi
SET cau_hinh_id = ky_thi_id
WHERE cau_hinh_id IS NULL AND ky_thi_id IS NOT NULL;

-- Gộp snapshot từ lan_thi_cau (nếu có)
UPDATE public.dao_tao_lan_thi lt
SET de_snapshot = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'cau_hoi_id', c.cau_hoi_id,
      'thu_tu', c.thu_tu_hien_thi,
      'loai', c.loai,
      'bloom_level', c.bloom_level,
      'chu_de_ma', NULL,
      'stem', c.stem,
      'giai_thich', c.giai_thich,
      'options', c.phuong_an_snapshot,
      'dap_an_dung', c.dap_an_dung,
      'tra_loi', c.tra_loi,
      'dung', c.dung
    )
    ORDER BY c.thu_tu_hien_thi
  )
  FROM public.dao_tao_lan_thi_cau c
  WHERE c.lan_thi_id = lt.id
), lt.de_snapshot)
WHERE EXISTS (
  SELECT 1 FROM public.dao_tao_lan_thi_cau c WHERE c.lan_thi_id = lt.id
)
AND COALESCE(jsonb_array_length(lt.de_snapshot), 0) = 0;

CREATE INDEX IF NOT EXISTS idx_dao_tao_lan_thi_cau_hinh
  ON public.dao_tao_lan_thi (cau_hinh_id) WHERE cau_hinh_id IS NOT NULL;

-- ─── 4) Gỡ cột / bảng thừa ──────────────────────────────────────────────────
ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_muc_do_id_fkey;
ALTER TABLE public.dao_tao_lan_thi DROP CONSTRAINT IF EXISTS dao_tao_lan_thi_ky_thi_id_fkey;
ALTER TABLE public.dao_tao_lan_thi DROP COLUMN IF EXISTS muc_do_id;
ALTER TABLE public.dao_tao_lan_thi DROP COLUMN IF EXISTS ky_thi_id;

ALTER TABLE public.dao_tao_cau_hoi DROP CONSTRAINT IF EXISTS dao_tao_cau_hoi_chu_de_id_fkey;
DROP INDEX IF EXISTS idx_dao_tao_cau_hoi_chu_de_active;
ALTER TABLE public.dao_tao_cau_hoi DROP COLUMN IF EXISTS chu_de_id;

DROP TABLE IF EXISTS public.dao_tao_lan_thi_cau CASCADE;
DROP TABLE IF EXISTS public.dao_tao_ky_thi_gan CASCADE;
DROP TABLE IF EXISTS public.dao_tao_ky_thi CASCADE;
DROP TABLE IF EXISTS public.dao_tao_muc_do_thi_thu CASCADE;
DROP TABLE IF EXISTS public.dao_tao_phuong_an CASCADE;
DROP TABLE IF EXISTS public.dao_tao_chu_de CASCADE;

-- ─── 5) RLS cho schema lean ─────────────────────────────────────────────────
ALTER TABLE public.dao_tao_cau_hinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dao_tao_cau_hinh_select ON public.dao_tao_cau_hinh;
CREATE POLICY dao_tao_cau_hinh_select ON public.dao_tao_cau_hinh
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR (
      is_active = true
      AND (
        loai_cau_hinh = 'thi_thu_muc_do'
        OR (loai_cau_hinh = 'thi_that' AND trang_thai = 'published')
      )
    )
  );

DROP POLICY IF EXISTS dao_tao_cau_hinh_write ON public.dao_tao_cau_hinh;
CREATE POLICY dao_tao_cau_hinh_write ON public.dao_tao_cau_hinh
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
  );

-- Làm gọn policy cau_hoi (không còn join phuong_an)
DROP POLICY IF EXISTS dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_select ON public.dao_tao_cau_hoi
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'view')
    OR is_active = true
  );

DROP POLICY IF EXISTS dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi;
CREATE POLICY dao_tao_cau_hoi_write ON public.dao_tao_cau_hoi
  FOR ALL TO authenticated
  USING (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  )
  WITH CHECK (
    public.is_admin_user()
    OR public.fn_sys_has_permission('DAO_TAO', 'create')
    OR public.fn_sys_has_permission('DAO_TAO', 'edit')
    OR public.fn_sys_has_permission('DAO_TAO', 'import')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dao_tao_cau_hinh TO authenticated, service_role;

COMMENT ON TABLE public.dao_tao_cau_hoi IS
  'Ngân hàng MCQ lean: phương án + chủ đề nhúng JSONB; dap_an_dung theo id ổn định.';
COMMENT ON TABLE public.dao_tao_cau_hinh IS
  'Cấu hình đề: mức độ thi thử hoặc kỳ thi thật (+ gan jsonb).';
COMMENT ON TABLE public.dao_tao_lan_thi IS
  'Lần làm bài: de_snapshot jsonb chứa đề + trả lời + chấm.';

-- Kiểm tra hậu migrate (notice)
DO $$
DECLARE
  n_q int;
  n_empty_pa int;
  n_cfg int;
BEGIN
  SELECT count(*) INTO n_q FROM public.dao_tao_cau_hoi WHERE is_active;
  SELECT count(*) INTO n_empty_pa FROM public.dao_tao_cau_hoi
    WHERE is_active AND coalesce(jsonb_array_length(phuong_an), 0) < 2;
  SELECT count(*) INTO n_cfg FROM public.dao_tao_cau_hinh WHERE loai_cau_hinh = 'thi_thu_muc_do';
  RAISE NOTICE 'dao_tao lean: active_questions=%, thin_options=%, muc_do_cfg=%', n_q, n_empty_pa, n_cfg;
  IF n_empty_pa > 0 THEN
    RAISE WARNING 'Có % câu active thiếu phương án JSONB', n_empty_pa;
  END IF;
  IF n_cfg < 3 THEN
    RAISE WARNING 'Thiếu cấu hình mức độ thi thử (có %)', n_cfg;
  END IF;
END $$;
