-- BV103: Hoàn thiện FK còn thiếu — backfill an toàn, giữ cột text legacy.

-- ---------------------------------------------------------------------------
-- 1) QLCV — seed mã trạng thái workflow (Track B) + FK
-- ---------------------------------------------------------------------------
INSERT INTO public.dm_trang_thai_cong_viec (id, ma, ten, mau_sac, thu_tu)
SELECT gen_random_uuid(), v.ma, v.ten, v.mau, v.ord
FROM (
  VALUES
    ('MOI', 'Mới', '#94A3B8', 10),
    ('DANG_LAM', 'Đang làm', '#3B82F6', 20),
    ('CHO_DUYET', 'Chờ nghiệm thu', '#F59E0B', 30),
    ('HOAN_THANH', 'Hoàn thành', '#10B981', 40),
    ('TU_CHOI', 'Từ chối', '#EF4444', 50),
    ('QUA_HAN', 'Quá hạn', '#DC2626', 60),
    ('DA_HUY', 'Đã hủy', '#6B7280', 70)
) AS v(ma, ten, mau, ord)
ON CONFLICT (ma) DO NOTHING;

ALTER TABLE public.fact_cong_viec
  ADD COLUMN IF NOT EXISTS loai_cong_viec_id uuid,
  ADD COLUMN IF NOT EXISTS trang_thai_id uuid;

UPDATE public.fact_cong_viec cv
SET loai_cong_viec_id = dm.id
FROM public.dm_loai_cong_viec dm
WHERE cv.loai_cong_viec_id IS NULL
  AND trim(coalesce(cv.loai_cong_viec, '')) <> ''
  AND public.bv103_norm_label(cv.loai_cong_viec) = public.bv103_norm_label(dm.ma);

UPDATE public.fact_cong_viec cv
SET trang_thai_id = dm.id
FROM public.dm_trang_thai_cong_viec dm
WHERE cv.trang_thai_id IS NULL
  AND trim(coalesce(cv.trang_thai, '')) <> ''
  AND public.bv103_norm_label(cv.trang_thai) = public.bv103_norm_label(dm.ma);

UPDATE public.fact_cong_viec
SET ma_trang_thai = trang_thai
WHERE trim(coalesce(ma_trang_thai, '')) <> trim(coalesce(trang_thai, ''))
  AND trim(coalesce(trang_thai, '')) <> '';

DO $$
BEGIN
  ALTER TABLE public.fact_cong_viec
    ADD CONSTRAINT fk_cong_viec_loai_cong_viec
    FOREIGN KEY (loai_cong_viec_id) REFERENCES public.dm_loai_cong_viec(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_cong_viec
    ADD CONSTRAINT fk_cong_viec_trang_thai_dm
    FOREIGN KEY (trang_thai_id) REFERENCES public.dm_trang_thai_cong_viec(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_cong_viec_loai_cong_viec_id
  ON public.fact_cong_viec (loai_cong_viec_id)
  WHERE loai_cong_viec_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_cong_viec_trang_thai_id
  ON public.fact_cong_viec (trang_thai_id)
  WHERE trang_thai_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) CSSD thiết bị / mẻ — loại máy tiệt khuẩn
-- ---------------------------------------------------------------------------
ALTER TABLE public.dm_thiet_bi
  ADD COLUMN IF NOT EXISTS loai_may_id uuid;

UPDATE public.dm_thiet_bi tb
SET loai_may_id = lm.id
FROM public.dm_loai_may_tiet_khuan lm
WHERE tb.loai_may_id IS NULL
  AND trim(coalesce(tb.loai_thiet_bi, '')) <> ''
  AND (
    public.bv103_norm_label(tb.loai_thiet_bi) = public.bv103_norm_label(lm.ma_loai_may)
    OR tb.loai_thiet_bi::text = lm.id::text
  );

ALTER TABLE public.fact_lo_tiet_khuan
  ADD COLUMN IF NOT EXISTS loai_may_id uuid;

UPDATE public.fact_lo_tiet_khuan lot
SET loai_may_id = tb.loai_may_id
FROM public.dm_thiet_bi tb
WHERE lot.thiet_bi_id = tb.id
  AND lot.loai_may_id IS NULL
  AND tb.loai_may_id IS NOT NULL;

UPDATE public.fact_lo_tiet_khuan lot
SET loai_may_id = lm.id
FROM public.dm_loai_may_tiet_khuan lm
WHERE lot.loai_may_id IS NULL
  AND trim(coalesce(lot.loai_tiet_khuan, '')) <> ''
  AND public.bv103_norm_label(lot.loai_tiet_khuan) = public.bv103_norm_label(lm.ma_loai_may);

DO $$
BEGIN
  ALTER TABLE public.dm_thiet_bi
    ADD CONSTRAINT fk_dm_thiet_bi_loai_may
    FOREIGN KEY (loai_may_id) REFERENCES public.dm_loai_may_tiet_khuan(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.fact_lo_tiet_khuan
    ADD CONSTRAINT fk_lo_tiet_khuan_loai_may
    FOREIGN KEY (loai_may_id) REFERENCES public.dm_loai_may_tiet_khuan(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3) CSSD sự cố — cấu trúc FK (app: GROUP:typeTen; dm legacy: SC-xxx)
-- ---------------------------------------------------------------------------
ALTER TABLE public.fact_su_co
  ADD COLUMN IF NOT EXISTS loai_su_co_id uuid,
  ADD COLUMN IF NOT EXISTS incident_group text,
  ADD COLUMN IF NOT EXISTS incident_type_label text;

UPDATE public.fact_su_co sc
SET
  incident_group = split_part(sc.ma_loai_su_co, ':', 1),
  incident_type_label = nullif(trim(split_part(sc.ma_loai_su_co, ':', 2)), '')
WHERE sc.ma_loai_su_co LIKE '%:%'
  AND trim(coalesce(sc.incident_group, '')) = '';

UPDATE public.fact_su_co sc
SET loai_su_co_id = dm.id
FROM public.dm_loai_su_co dm
WHERE sc.loai_su_co_id IS NULL
  AND trim(coalesce(sc.ma_loai_su_co, '')) <> ''
  AND sc.ma_loai_su_co NOT LIKE '%:%'
  AND public.bv103_norm_label(sc.ma_loai_su_co) = public.bv103_norm_label(dm.ma_loai_su_co);

DO $$
BEGIN
  ALTER TABLE public.fact_su_co
    ADD CONSTRAINT fk_su_co_loai_su_co
    FOREIGN KEY (loai_su_co_id) REFERENCES public.dm_loai_su_co(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Kho legacy — vat_tu → hóa chất (chỉ khi không orphan)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_orphan bigint;
BEGIN
  SELECT count(*) INTO v_orphan
  FROM public.fact_kho_chi_tiet kc
  WHERE kc.vat_tu_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.dm_hoa_chat h WHERE h.id = kc.vat_tu_id);

  IF v_orphan = 0 THEN
    ALTER TABLE public.fact_kho_chi_tiet
      ADD CONSTRAINT fk_kho_chi_tiet_vat_tu
      FOREIGN KEY (vat_tu_id) REFERENCES public.dm_hoa_chat(id)
      ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'BV103: bỏ qua fk_kho_chi_tiet_vat_tu — % orphan', v_orphan;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 5) View QLCV — join danh mục (giữ cột text workflow)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

CREATE VIEW public.v_fact_cong_viec_full AS
SELECT
  cv.*,
  lc.ma AS ma_loai_cong_viec_dm,
  COALESCE(lc.ten, cv.loai_cong_viec) AS ten_loai_cong_viec,
  ts.ma AS ma_trang_thai_dm,
  COALESCE(ts.ten, cv.trang_thai) AS ten_trang_thai_hien_thi,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  k.ten_khoa AS khoa_thuc_hien_ten,
  t.ten_to AS to_cong_tac_ten,
  (cv.han_hoan_thanh IS NOT NULL AND cv.han_hoan_thanh < CURRENT_DATE
    AND cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')) AS is_qua_han,
  (SELECT count(*)::int FROM public.fact_cong_viec sub
   WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count
FROM public.fact_cong_viec cv
LEFT JOIN public.dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
LEFT JOIN public.dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE VIEW public.v_cong_viec_qua_han AS
SELECT * FROM public.v_fact_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role;

-- View thiết bị đọc kèm tên loại máy
CREATE OR REPLACE VIEW public.v_dm_thiet_bi_full
WITH (security_invoker = true) AS
SELECT
  tb.*,
  lm.ma_loai_may,
  COALESCE(lm.ten_loai_may, tb.loai_thiet_bi) AS ten_loai_may_hien_thi
FROM public.dm_thiet_bi tb
LEFT JOIN public.dm_loai_may_tiet_khuan lm ON lm.id = tb.loai_may_id;

GRANT SELECT ON public.v_dm_thiet_bi_full TO authenticated, service_role;
