-- QLCV: seed dm + view (tương thích schema pilot: dm_loai có ma/ten; dm_trạng thái ma hoặc ma_trang_thai).

DO $seed$
DECLARE
  v_loai_has_active boolean;
  v_tt_has_ma boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dm_loai_cong_viec' AND column_name = 'is_active'
  ) INTO v_loai_has_active;

  IF v_loai_has_active THEN
    INSERT INTO public.dm_loai_cong_viec (ma, ten, is_active)
    SELECT v.ma, v.ten, true
    FROM (VALUES ('DINH_KY', 'Định kỳ'), ('DOT_XUAT', 'Đột xuất'), ('KHAN_CAP', 'Khẩn cấp')) AS v(ma, ten)
    WHERE NOT EXISTS (SELECT 1 FROM public.dm_loai_cong_viec x WHERE x.ma = v.ma);
  ELSE
    INSERT INTO public.dm_loai_cong_viec (ma, ten)
    SELECT v.ma, v.ten
    FROM (VALUES ('DINH_KY', 'Định kỳ'), ('DOT_XUAT', 'Đột xuất'), ('KHAN_CAP', 'Khẩn cấp')) AS v(ma, ten)
    WHERE NOT EXISTS (SELECT 1 FROM public.dm_loai_cong_viec x WHERE x.ma = v.ma);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dm_trang_thai_cong_viec' AND column_name = 'ma'
  ) INTO v_tt_has_ma;

  IF v_tt_has_ma THEN
    INSERT INTO public.dm_trang_thai_cong_viec (ma, ten, thu_tu)
    SELECT v.ma, v.ten, v.ord
    FROM (
      VALUES
        ('MOI', 'Mới', 10),
        ('DANG_LAM', 'Đang làm', 20),
        ('CHO_DUYET', 'Chờ nghiệm thu', 30),
        ('HOAN_THANH', 'Hoàn thành', 40),
        ('TU_CHOI', 'Từ chối', 50),
        ('QUA_HAN', 'Quá hạn', 60),
        ('DA_HUY', 'Đã hủy', 70)
    ) AS v(ma, ten, ord)
    WHERE NOT EXISTS (SELECT 1 FROM public.dm_trang_thai_cong_viec x WHERE x.ma = v.ma);
  ELSE
    INSERT INTO public.dm_trang_thai_cong_viec (ma_trang_thai, ten_trang_thai, thu_tu)
    SELECT v.ma, v.ten, v.ord
    FROM (
      VALUES
        ('MOI', 'Mới', 10),
        ('DANG_LAM', 'Đang làm', 20),
        ('CHO_DUYET', 'Chờ nghiệm thu', 30),
        ('HOAN_THANH', 'Hoàn thành', 40),
        ('TU_CHOI', 'Từ chối', 50),
        ('QUA_HAN', 'Quá hạn', 60),
        ('DA_HUY', 'Đã hủy', 70)
    ) AS v(ma, ten, ord)
    WHERE NOT EXISTS (SELECT 1 FROM public.dm_trang_thai_cong_viec x WHERE x.ma_trang_thai = v.ma);
  END IF;
END $seed$;

UPDATE public.fact_cong_viec cv
SET loai_cong_viec_id = dm.id
FROM public.dm_loai_cong_viec dm
WHERE cv.loai_cong_viec_id IS NULL AND dm.ma = 'DOT_XUAT';

DO $tt$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dm_trang_thai_cong_viec' AND column_name = 'ma'
  ) THEN
    UPDATE public.fact_cong_viec cv
    SET trang_thai_id = dm.id
    FROM public.dm_trang_thai_cong_viec dm
    WHERE cv.trang_thai_id IS NULL AND dm.ma = 'MOI';
  ELSE
    UPDATE public.fact_cong_viec cv
    SET trang_thai_id = dm.id
    FROM public.dm_trang_thai_cong_viec dm
    WHERE cv.trang_thai_id IS NULL AND dm.ma_trang_thai = 'MOI';
  END IF;
END $tt$;

DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

CREATE VIEW public.v_fact_cong_viec_full
WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.cong_viec_cha_id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec_id,
  lc.ma AS loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai_id,
  ts.ma AS trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.khoa_thuc_hien_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  k.ten_khoa AS khoa_thuc_hien_ten,
  t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND coalesce(ts.ma, '') NOT IN ('HOAN_THANH', 'DA_HUY')
  ) AS is_qua_han,
  (
    SELECT count(*)::int
    FROM public.fact_cong_viec sub
    WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true
  ) AS cong_viec_con_count
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

CREATE OR REPLACE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_moi_id uuid;
BEGIN
  SELECT id INTO v_loai_id FROM public.dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;
  SELECT id INTO v_tt_moi_id
  FROM public.dm_trang_thai_cong_viec
  WHERE ma = 'MOI'
  LIMIT 1;

  FOR r IN SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    match_due := false;
    IF r.ma_chu_ky = 'WEEKLY' THEN
      match_due := (r.ngay_bat_dau <= due) AND mod((due - r.ngay_bat_dau)::integer, 7) = 0;
    ELSE
      match_due := (r.ngay_bat_dau <= due)
        AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
    END IF;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    INSERT INTO public.fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_moi_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

ALTER TABLE public.dm_loai_cong_viec ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_trang_thai_cong_viec ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_loai_cong_viec_select_authenticated ON public.dm_loai_cong_viec;
CREATE POLICY dm_loai_cong_viec_select_authenticated ON public.dm_loai_cong_viec
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS dm_trang_thai_cong_viec_select_authenticated ON public.dm_trang_thai_cong_viec;
CREATE POLICY dm_trang_thai_cong_viec_select_authenticated ON public.dm_trang_thai_cong_viec
  FOR SELECT TO authenticated USING (true);
