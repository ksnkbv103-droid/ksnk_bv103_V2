-- QLCV: giờ trên mẫu định kỳ + địa điểm khoa MDM + chương trình mỏng
-- Additive; không khôi phục khoa_thuc_hien_id.

BEGIN;

-- ── 1) Giờ + địa điểm trên mẫu định kỳ ───────────────────────────────────────
ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS gio_bat_dau time without time zone,
  ADD COLUMN IF NOT EXISTS gio_ket_thuc time without time zone,
  ADD COLUMN IF NOT EXISTS dia_diem_khoa_id uuid REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_qlcv_dinh_ky_gio'
  ) THEN
    ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
      ADD CONSTRAINT ck_qlcv_dinh_ky_gio CHECK (
        gio_bat_dau IS NULL OR gio_ket_thuc IS NULL OR gio_ket_thuc > gio_bat_dau
      );
  END IF;
END $$;

COMMENT ON COLUMN public.qlcv_fact_cong_viec_dinh_ky.dia_diem_khoa_id IS
  'Khoa/đơn vị nơi thực hiện (MDM) — khác phạm vi KSNK-only.';
COMMENT ON COLUMN public.qlcv_fact_cong_viec_dinh_ky.gio_bat_dau IS
  'Giờ bắt đầu khung thời gian mặc định khi nạp vào kế hoạch tuần / spawn.';
COMMENT ON COLUMN public.qlcv_fact_cong_viec_dinh_ky.gio_ket_thuc IS
  'Giờ kết thúc khung thời gian mặc định.';

CREATE INDEX IF NOT EXISTS idx_qlcv_dinh_ky_dia_diem
  ON public.qlcv_fact_cong_viec_dinh_ky (dia_diem_khoa_id)
  WHERE dia_diem_khoa_id IS NOT NULL;

-- ── 2) Địa điểm khoa trên phiếu + dòng tuần ──────────────────────────────────
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS dia_diem_khoa_id uuid REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE SET NULL;

ALTER TABLE public.qlcv_fact_ke_hoach_tuan_dong
  ADD COLUMN IF NOT EXISTS dia_diem_khoa_id uuid REFERENCES public.mdm_dm_khoa_phong(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.dia_diem_khoa_id IS
  'Khoa/đơn vị nơi thực hiện công việc (MDM).';
COMMENT ON COLUMN public.qlcv_fact_ke_hoach_tuan_dong.dia_diem_khoa_id IS
  'Khoa/đơn vị nơi thực hiện trên dòng phân công tuần.';

CREATE INDEX IF NOT EXISTS idx_qlcv_fact_cv_dia_diem
  ON public.qlcv_fact_cong_viec (dia_diem_khoa_id)
  WHERE dia_diem_khoa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qlcv_kht_dong_dia_diem
  ON public.qlcv_fact_ke_hoach_tuan_dong (dia_diem_khoa_id)
  WHERE dia_diem_khoa_id IS NOT NULL;

-- ── 3) Chương trình (Project mỏng) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qlcv_fact_chuong_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ten text NOT NULL,
  muc_tieu text,
  mo_ta text,
  ngay_bat_dau date,
  ngay_ket_thuc date,
  trang_thai text NOT NULL DEFAULT 'DANG_CHAY',
  nguoi_chu_tri_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  nguoi_tao_id uuid REFERENCES public.mdm_nhan_su(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_qlcv_ct_trang_thai CHECK (
    trang_thai = ANY (ARRAY[
      'NHAP'::text,
      'DANG_CHAY'::text,
      'TAM_DUNG'::text,
      'DONG'::text
    ])
  ),
  CONSTRAINT ck_qlcv_ct_ngay CHECK (
    ngay_bat_dau IS NULL OR ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau
  )
);

COMMENT ON TABLE public.qlcv_fact_chuong_trinh IS
  'Chương trình / đề án KSNK — nhóm mỏng các phiếu và kế hoạch tuần.';

CREATE INDEX IF NOT EXISTS idx_qlcv_ct_trang_thai
  ON public.qlcv_fact_chuong_trinh (trang_thai)
  WHERE is_active = true;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS chuong_trinh_id uuid REFERENCES public.qlcv_fact_chuong_trinh(id) ON DELETE SET NULL;

ALTER TABLE public.qlcv_fact_ke_hoach_tuan
  ADD COLUMN IF NOT EXISTS chuong_trinh_id uuid REFERENCES public.qlcv_fact_chuong_trinh(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qlcv_fact_cv_chuong_trinh
  ON public.qlcv_fact_cong_viec (chuong_trinh_id)
  WHERE chuong_trinh_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qlcv_kht_chuong_trinh
  ON public.qlcv_fact_ke_hoach_tuan (chuong_trinh_id)
  WHERE chuong_trinh_id IS NOT NULL;

ALTER TABLE public.qlcv_fact_chuong_trinh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qlcv_ct_select_ksnk ON public.qlcv_fact_chuong_trinh;
CREATE POLICY qlcv_ct_select_ksnk
  ON public.qlcv_fact_chuong_trinh
  FOR SELECT TO authenticated
  USING (public.fn_qlcv_can_read_fact());

DROP POLICY IF EXISTS qlcv_ct_all_service ON public.qlcv_fact_chuong_trinh;
CREATE POLICY qlcv_ct_all_service
  ON public.qlcv_fact_chuong_trinh
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.qlcv_fact_chuong_trinh TO authenticated;
GRANT ALL ON public.qlcv_fact_chuong_trinh TO service_role;

-- ── 4) View phiếu (địa điểm khoa + chương trình) ─────────────────────────────
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
LEFT JOIN public.qlcv_fact_chuong_trinh ct ON cv.chuong_trinh_id = ct.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

-- ── 5) Spawn: copy giờ + địa điểm khoa ───────────────────────────────────────
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

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
      ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
      nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
      vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
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

-- ── 6) Publish tuần: copy địa điểm khoa + sync tiêu đề khi reuse ─────────────
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
        chuong_trinh_id = coalesce(cv.chuong_trinh_id, v_hdr.chuong_trinh_id),
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
        nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id, chuong_trinh_id,
        vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
        nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active,
        checklist, nhat_ky, ke_hoach_tuan_dong_id
      ) VALUES (
        v_dong.tieu_de, v_dong.mo_ta, v_loai, v_tt, coalesce(v_dong.muc_do_uu_tien, 'TRUNG_BINH'),
        v_han, v_dong.ngay_thuc_hien, v_dong.gio_bat_dau, v_dong.gio_ket_thuc, v_dong.dia_diem_khoa_id,
        v_dong.nguoi_phu_trach_id, v_dong.to_cong_tac_id, v_dong.dinh_ky_mau_id, v_hdr.chuong_trinh_id,
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
        chuong_trinh_id = coalesce(cv.chuong_trinh_id, v_hdr.chuong_trinh_id),
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
