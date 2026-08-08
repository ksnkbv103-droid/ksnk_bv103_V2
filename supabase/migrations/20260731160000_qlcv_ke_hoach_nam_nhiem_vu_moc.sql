-- QLCV: Kế hoạch năm (nâng chuong_trinh) + Nhiệm vụ + Mốc + FK phiếu/tuần/định kỳ
BEGIN;

-- ── 1) Kế hoạch năm trên qlcv_fact_chuong_trinh ──────────────────────────────
ALTER TABLE public.qlcv_fact_chuong_trinh
  ADD COLUMN IF NOT EXISTS nam integer,
  ADD COLUMN IF NOT EXISTS loai text NOT NULL DEFAULT 'NAM';

UPDATE public.qlcv_fact_chuong_trinh
SET nam = COALESCE(
  EXTRACT(YEAR FROM ngay_bat_dau)::int,
  EXTRACT(YEAR FROM timezone('Asia/Ho_Chi_Minh', now()))::int
)
WHERE nam IS NULL;

ALTER TABLE public.qlcv_fact_chuong_trinh
  ALTER COLUMN nam SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qlcv_ct_nam') THEN
    ALTER TABLE public.qlcv_fact_chuong_trinh
      ADD CONSTRAINT ck_qlcv_ct_nam CHECK (nam >= 2000 AND nam <= 2100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qlcv_ct_loai') THEN
    ALTER TABLE public.qlcv_fact_chuong_trinh
      ADD CONSTRAINT ck_qlcv_ct_loai CHECK (loai = ANY (ARRAY['NAM'::text]));
  END IF;
END $$;

COMMENT ON TABLE public.qlcv_fact_chuong_trinh IS
  'Kế hoạch năm KSNK (tên bảng giữ chuong_trinh). UI/docs: Kế hoạch năm.';
COMMENT ON COLUMN public.qlcv_fact_chuong_trinh.nam IS 'Năm kế hoạch.';

CREATE INDEX IF NOT EXISTS idx_qlcv_ct_nam
  ON public.qlcv_fact_chuong_trinh (nam)
  WHERE is_active = true;

-- ── 2) Nhiệm vụ ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qlcv_fact_nhiem_vu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ke_hoach_id uuid NOT NULL REFERENCES public.qlcv_fact_chuong_trinh(id) ON DELETE CASCADE,
  ten text NOT NULL,
  pham_vi_ap_dung text,
  chi_tieu text,
  chi_dao text,
  bien_phap text,
  noi_dung_can_dat text,
  khung_thoi_gian_ghi_chu text,
  chu_ky_goi_y text,
  nam integer NOT NULL,
  quy smallint,
  thang smallint,
  nguoi_chu_tri_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  nguoi_phoi_hop_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  han_hoan_thanh date,
  trang_thai text NOT NULL DEFAULT 'NHAP',
  thu_tu integer NOT NULL DEFAULT 0,
  nguoi_tao_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_qlcv_nv_trang_thai CHECK (
    trang_thai = ANY (ARRAY[
      'NHAP'::text, 'DANG_LAM'::text, 'HOAN_THANH'::text, 'TAM_DUNG'::text, 'HUY'::text
    ])
  ),
  CONSTRAINT ck_qlcv_nv_chu_ky CHECK (
    chu_ky_goi_y IS NULL OR chu_ky_goi_y = ANY (ARRAY[
      'TUAN'::text, 'THANG'::text, 'QUY'::text, 'NAM'::text, 'MOT_LAN'::text
    ])
  ),
  CONSTRAINT ck_qlcv_nv_quy CHECK (quy IS NULL OR (quy >= 1 AND quy <= 4)),
  CONSTRAINT ck_qlcv_nv_thang CHECK (thang IS NULL OR (thang >= 1 AND thang <= 12)),
  CONSTRAINT ck_qlcv_nv_thang_quy CHECK (
    thang IS NULL OR quy IS NULL OR quy = ((thang - 1) / 3 + 1)
  )
);

COMMENT ON TABLE public.qlcv_fact_nhiem_vu IS
  'Nhiệm vụ trong kế hoạch năm — đơn vị văn bản in (phạm vi, chỉ tiêu, biện pháp…).';

CREATE INDEX IF NOT EXISTS idx_qlcv_nv_ke_hoach
  ON public.qlcv_fact_nhiem_vu (ke_hoach_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_qlcv_nv_nam_quy_thang
  ON public.qlcv_fact_nhiem_vu (nam, quy, thang)
  WHERE is_active = true;

ALTER TABLE public.qlcv_fact_nhiem_vu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qlcv_nv_select_ksnk ON public.qlcv_fact_nhiem_vu;
CREATE POLICY qlcv_nv_select_ksnk
  ON public.qlcv_fact_nhiem_vu
  FOR SELECT TO authenticated
  USING (public.fn_qlcv_can_read_fact());

DROP POLICY IF EXISTS qlcv_nv_all_service ON public.qlcv_fact_nhiem_vu;
CREATE POLICY qlcv_nv_all_service
  ON public.qlcv_fact_nhiem_vu
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.qlcv_fact_nhiem_vu TO authenticated;
GRANT ALL ON public.qlcv_fact_nhiem_vu TO service_role;

-- ── 3) Mốc thời gian ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qlcv_fact_nhiem_vu_moc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nhiem_vu_id uuid NOT NULL REFERENCES public.qlcv_fact_nhiem_vu(id) ON DELETE CASCADE,
  ten_moc text NOT NULL,
  ngay_moc date NOT NULL,
  ky_label text,
  noi_dung_can_dat text,
  trang_thai text NOT NULL DEFAULT 'CHUA_TOI',
  thu_tu integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_qlcv_moc_trang_thai CHECK (
    trang_thai = ANY (ARRAY[
      'CHUA_TOI'::text, 'DANG_LAM'::text, 'DAT'::text, 'TRE'::text
    ])
  )
);

COMMENT ON TABLE public.qlcv_fact_nhiem_vu_moc IS
  'Mốc thời gian của nhiệm vụ — SSOT lịch; ngày bắt buộc.';

CREATE INDEX IF NOT EXISTS idx_qlcv_moc_nhiem_vu
  ON public.qlcv_fact_nhiem_vu_moc (nhiem_vu_id, ngay_moc)
  WHERE is_active = true;

ALTER TABLE public.qlcv_fact_nhiem_vu_moc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qlcv_moc_select_ksnk ON public.qlcv_fact_nhiem_vu_moc;
CREATE POLICY qlcv_moc_select_ksnk
  ON public.qlcv_fact_nhiem_vu_moc
  FOR SELECT TO authenticated
  USING (public.fn_qlcv_can_read_fact());

DROP POLICY IF EXISTS qlcv_moc_all_service ON public.qlcv_fact_nhiem_vu_moc;
CREATE POLICY qlcv_moc_all_service
  ON public.qlcv_fact_nhiem_vu_moc
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.qlcv_fact_nhiem_vu_moc TO authenticated;
GRANT ALL ON public.qlcv_fact_nhiem_vu_moc TO service_role;

-- ── 4) FK trên phiếu / dòng tuần / mẫu định kỳ ───────────────────────────────
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS nhiem_vu_id uuid REFERENCES public.qlcv_fact_nhiem_vu(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moc_id uuid REFERENCES public.qlcv_fact_nhiem_vu_moc(id) ON DELETE SET NULL;

ALTER TABLE public.qlcv_fact_ke_hoach_tuan_dong
  ADD COLUMN IF NOT EXISTS nhiem_vu_id uuid REFERENCES public.qlcv_fact_nhiem_vu(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moc_id uuid REFERENCES public.qlcv_fact_nhiem_vu_moc(id) ON DELETE SET NULL;

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS nhiem_vu_id uuid REFERENCES public.qlcv_fact_nhiem_vu(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moc_id uuid REFERENCES public.qlcv_fact_nhiem_vu_moc(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qlcv_cv_nhiem_vu
  ON public.qlcv_fact_cong_viec (nhiem_vu_id)
  WHERE nhiem_vu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qlcv_cv_moc
  ON public.qlcv_fact_cong_viec (moc_id)
  WHERE moc_id IS NOT NULL;

-- ── 5) View phiếu ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_qua_han;
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_full;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  ts.mau_sac AS trang_thai_mau_sac,
  cv.muc_do_uu_tien,
  cv.han_hoan_thanh,
  cv.ngay_thuc_hien,
  cv.gio_bat_dau,
  cv.gio_ket_thuc,
  cv.ke_hoach_tuan_dong_id,
  cv.dia_diem_khoa_id,
  kp.ma_khoa AS dia_diem_khoa_ma,
  kp.ten_khoa AS dia_diem_khoa_ten,
  cv.chuong_trinh_id,
  ct.ten AS chuong_trinh_ten,
  ct.nam AS ke_hoach_nam,
  cv.nhiem_vu_id,
  nv.ten AS nhiem_vu_ten,
  cv.moc_id,
  moc.ten_moc AS moc_ten,
  moc.ngay_moc AS moc_ngay,
  cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id,
  cv.nguoi_giao_viec_id,
  cv.nguoi_phu_trach_id,
  cv.to_cong_tac_id,
  cv.dinh_ky_mau_id,
  cv.vi_tri_thuc_hien,
  cv.nguoi_phoi_hop_ids,
  cv.nguoi_theo_doi_ids,
  cv.is_active,
  cv.created_at,
  cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten,
  ns_phu.ho_ten AS nguoi_phu_trach_ten,
  ns_giao.ho_ten AS nguoi_giao_ten,
  t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  cv.checklist,
  cv.nhat_ky,
  cv.analytics_meta
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.ma = cv.loai_cong_viec
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.ma = cv.trang_thai
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id
LEFT JOIN public.mdm_dm_khoa_phong kp ON cv.dia_diem_khoa_id = kp.id
LEFT JOIN public.qlcv_fact_chuong_trinh ct ON cv.chuong_trinh_id = ct.id
LEFT JOIN public.qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id
LEFT JOIN public.qlcv_fact_nhiem_vu_moc moc ON cv.moc_id = moc.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

-- ── 6) Spawn: copy nhiem_vu_id / moc_id ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  due date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
  match_due boolean;
  v_tt text;
  anchor_months int;
  due_months int;
  v_rows int;
  v_ke_hoach uuid;
BEGIN
  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
    match_due := false;
    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN match_due := true;
      WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      WHEN 'YEARLY' THEN
        match_due :=
          extract(month from due::timestamp) = extract(month from r.ngay_bat_dau::timestamp)
          AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      ELSE CONTINUE;
    END CASE;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due AND c.is_active = true
    ) THEN CONTINUE; END IF;

    v_tt := CASE WHEN r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN 'DANG_LAM' ELSE 'MOI' END;
    v_ke_hoach := NULL;
    IF r.nhiem_vu_id IS NOT NULL THEN
      SELECT nv.ke_hoach_id INTO v_ke_hoach FROM public.qlcv_fact_nhiem_vu nv WHERE nv.id = r.nhiem_vu_id;
    END IF;

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
      ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
      nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
      chuong_trinh_id, nhiem_vu_id, moc_id,
      vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
      v_ke_hoach, r.nhiem_vu_id, r.moc_id,
      r.vi_tri_thuc_hien, coalesce(r.nguoi_phoi_hop_ids, '{}'::uuid[]), coalesce(r.nguoi_theo_doi_ids, '{}'::uuid[]),
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
      public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
    )
    ON CONFLICT (dinh_ky_mau_id, han_hoan_thanh)
      WHERE (dinh_ky_mau_id IS NOT NULL AND han_hoan_thanh IS NOT NULL AND is_active = true)
      DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      inserted := inserted + 1;
    END IF;
  END LOOP;
  RETURN inserted;
END;
$function$;

-- ── 7) Publish tuần: copy nhiem_vu_id / moc_id ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_qlcv_ke_hoach_tuan_publish(
  p_ke_hoach_id uuid,
  p_actor_nhan_su_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_hdr public.qlcv_fact_ke_hoach_tuan%ROWTYPE;
  v_dong record;
  v_cv_id uuid;
  v_tt text;
  v_loai text;
  v_han date;
  v_count int := 0;
  v_snap jsonb;
  v_ke_hoach uuid;
  v_nhiem_vu uuid;
  v_moc uuid;
BEGIN
  IF p_actor_nhan_su_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu người chốt kế hoạch tuần';
  END IF;

  SELECT * INTO v_hdr
  FROM public.qlcv_fact_ke_hoach_tuan
  WHERE id = p_ke_hoach_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ tuần';
  END IF;

  IF v_hdr.trang_thai NOT IN ('NHAP', 'DA_DIEU_CHINH') THEN
    RAISE EXCEPTION 'Chỉ chốt được hồ sơ ở trạng thái Nháp hoặc Điều chỉnh (hiện: %)', v_hdr.trang_thai;
  END IF;

  FOR v_dong IN
    SELECT *
    FROM public.qlcv_fact_ke_hoach_tuan_dong
    WHERE ke_hoach_id = p_ke_hoach_id
    ORDER BY ngay_thuc_hien, coalesce(gio_bat_dau, '00:00'::time), thu_tu
  LOOP
    IF v_dong.tieu_de IS NULL OR btrim(v_dong.tieu_de) = '' THEN
      RAISE EXCEPTION 'Dòng thiếu tiêu đề công việc';
    END IF;
    IF v_dong.nguoi_phu_trach_id IS NULL THEN
      RAISE EXCEPTION 'Dòng "%" thiếu người phụ trách — bắt buộc trước khi chốt', v_dong.tieu_de;
    END IF;

    v_nhiem_vu := v_dong.nhiem_vu_id;
    v_moc := v_dong.moc_id;
    v_ke_hoach := v_hdr.chuong_trinh_id;
    IF v_nhiem_vu IS NOT NULL THEN
      SELECT nv.ke_hoach_id INTO v_ke_hoach FROM public.qlcv_fact_nhiem_vu nv WHERE nv.id = v_nhiem_vu;
    END IF;
    IF v_moc IS NOT NULL AND v_nhiem_vu IS NULL THEN
      SELECT m.nhiem_vu_id INTO v_nhiem_vu FROM public.qlcv_fact_nhiem_vu_moc m WHERE m.id = v_moc;
      IF v_nhiem_vu IS NOT NULL THEN
        SELECT nv.ke_hoach_id INTO v_ke_hoach FROM public.qlcv_fact_nhiem_vu nv WHERE nv.id = v_nhiem_vu;
      END IF;
    END IF;

    IF v_dong.cong_viec_id IS NOT NULL THEN
      UPDATE public.qlcv_fact_cong_viec cv
      SET
        tieu_de = v_dong.tieu_de,
        mo_ta = v_dong.mo_ta,
        muc_do_uu_tien = coalesce(v_dong.muc_do_uu_tien, 'TRUNG_BINH'),
        han_hoan_thanh = coalesce(v_dong.han_hoan_thanh, v_dong.ngay_thuc_hien),
        ngay_thuc_hien = v_dong.ngay_thuc_hien,
        gio_bat_dau = v_dong.gio_bat_dau,
        gio_ket_thuc = v_dong.gio_ket_thuc,
        dia_diem_khoa_id = v_dong.dia_diem_khoa_id,
        vi_tri_thuc_hien = v_dong.vi_tri_thuc_hien,
        nguoi_phu_trach_id = v_dong.nguoi_phu_trach_id,
        to_cong_tac_id = v_dong.to_cong_tac_id,
        nguoi_phoi_hop_ids = coalesce(v_dong.nguoi_phoi_hop_ids, '{}'::uuid[]),
        nguoi_theo_doi_ids = coalesce(v_dong.nguoi_theo_doi_ids, '{}'::uuid[]),
        chuong_trinh_id = coalesce(v_ke_hoach, cv.chuong_trinh_id, v_hdr.chuong_trinh_id),
        nhiem_vu_id = coalesce(v_nhiem_vu, cv.nhiem_vu_id),
        moc_id = coalesce(v_moc, cv.moc_id),
        ke_hoach_tuan_dong_id = v_dong.id,
        updated_at = now()
      WHERE cv.id = v_dong.cong_viec_id
        AND cv.trang_thai NOT IN ('HOAN_THANH', 'DA_HUY');
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    v_han := coalesce(v_dong.han_hoan_thanh, v_dong.ngay_thuc_hien);
    v_loai := CASE WHEN v_dong.nguon = 'DINH_KY' THEN 'DINH_KY' ELSE 'DOT_XUAT' END;
    v_tt := CASE
      WHEN v_dong.nguoi_phu_trach_id IS NOT NULL OR v_dong.to_cong_tac_id IS NOT NULL THEN 'DANG_LAM'
      ELSE 'MOI'
    END;
    v_cv_id := NULL;

    IF v_dong.dinh_ky_mau_id IS NOT NULL THEN
      SELECT c.id INTO v_cv_id
      FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = v_dong.dinh_ky_mau_id
        AND c.han_hoan_thanh = v_han
        AND c.is_active = true
      LIMIT 1;
    END IF;

    IF v_cv_id IS NULL THEN
      INSERT INTO public.qlcv_fact_cong_viec (
        tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien,
        han_hoan_thanh, ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
        nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
        chuong_trinh_id, nhiem_vu_id, moc_id,
        vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
        nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active,
        checklist, nhat_ky, ke_hoach_tuan_dong_id
      ) VALUES (
        v_dong.tieu_de, v_dong.mo_ta, v_loai, v_tt, coalesce(v_dong.muc_do_uu_tien, 'TRUNG_BINH'),
        v_han, v_dong.ngay_thuc_hien, v_dong.gio_bat_dau, v_dong.gio_ket_thuc, v_dong.dia_diem_khoa_id,
        v_dong.nguoi_phu_trach_id, v_dong.to_cong_tac_id, v_dong.dinh_ky_mau_id,
        v_ke_hoach, v_nhiem_vu, v_moc,
        v_dong.vi_tri_thuc_hien,
        coalesce(v_dong.nguoi_phoi_hop_ids, '{}'::uuid[]),
        coalesce(v_dong.nguoi_theo_doi_ids, '{}'::uuid[]),
        p_actor_nhan_su_id, p_actor_nhan_su_id, 0, true,
        public.fn_qlcv_mo_ta_to_checklist(v_dong.mo_ta), '[]'::jsonb, v_dong.id
      )
      RETURNING id INTO v_cv_id;
    ELSE
      UPDATE public.qlcv_fact_cong_viec cv
      SET
        tieu_de = v_dong.tieu_de,
        mo_ta = coalesce(v_dong.mo_ta, cv.mo_ta),
        muc_do_uu_tien = coalesce(v_dong.muc_do_uu_tien, cv.muc_do_uu_tien),
        ngay_thuc_hien = v_dong.ngay_thuc_hien,
        gio_bat_dau = v_dong.gio_bat_dau,
        gio_ket_thuc = v_dong.gio_ket_thuc,
        dia_diem_khoa_id = coalesce(v_dong.dia_diem_khoa_id, cv.dia_diem_khoa_id),
        vi_tri_thuc_hien = coalesce(v_dong.vi_tri_thuc_hien, cv.vi_tri_thuc_hien),
        nguoi_phu_trach_id = coalesce(v_dong.nguoi_phu_trach_id, cv.nguoi_phu_trach_id),
        to_cong_tac_id = coalesce(v_dong.to_cong_tac_id, cv.to_cong_tac_id),
        nguoi_phoi_hop_ids = coalesce(v_dong.nguoi_phoi_hop_ids, cv.nguoi_phoi_hop_ids),
        nguoi_theo_doi_ids = coalesce(v_dong.nguoi_theo_doi_ids, cv.nguoi_theo_doi_ids),
        chuong_trinh_id = coalesce(v_ke_hoach, cv.chuong_trinh_id, v_hdr.chuong_trinh_id),
        nhiem_vu_id = coalesce(v_nhiem_vu, cv.nhiem_vu_id),
        moc_id = coalesce(v_moc, cv.moc_id),
        ke_hoach_tuan_dong_id = v_dong.id,
        updated_at = now()
      WHERE cv.id = v_cv_id;
    END IF;

    UPDATE public.qlcv_fact_ke_hoach_tuan_dong
    SET cong_viec_id = v_cv_id, updated_at = now()
    WHERE id = v_dong.id;

    v_count := v_count + 1;
  END LOOP;

  SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.ngay_thuc_hien, d.thu_tu), '[]'::jsonb)
  INTO v_snap
  FROM public.qlcv_fact_ke_hoach_tuan_dong d
  WHERE d.ke_hoach_id = p_ke_hoach_id;

  UPDATE public.qlcv_fact_ke_hoach_tuan
  SET
    trang_thai = 'DA_CHOT',
    nguoi_chot_id = p_actor_nhan_su_id,
    chot_luc = now(),
    snapshot_ke_hoach = jsonb_build_object(
      'chot_luc', now(),
      'nguoi_chot_id', p_actor_nhan_su_id,
      'dong', v_snap
    ),
    ma_ho_so = coalesce(
      ma_ho_so,
      'QLCV-PLAN-' || to_char(tuan_bat_dau, 'IYYY') || '-W' || to_char(tuan_bat_dau, 'IW') || '-v' || phien_ban::text
    ),
    updated_at = now()
  WHERE id = p_ke_hoach_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ke_hoach_id', p_ke_hoach_id,
    'published_rows', v_count
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_qlcv_ke_hoach_tuan_publish(uuid, uuid) TO service_role;

COMMIT;
