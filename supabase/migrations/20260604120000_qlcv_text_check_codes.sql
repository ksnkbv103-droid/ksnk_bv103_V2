-- D-QLCV-01: trang_thai + loai_cong_viec TEXT + CHECK (giảm SELECT FK mỗi write).

BEGIN;

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS trang_thai text,
  ADD COLUMN IF NOT EXISTS loai_cong_viec text;

UPDATE public.qlcv_fact_cong_viec cv
SET trang_thai = ts.ma
FROM public.qlcv_dm_trang_thai_cong_viec ts
WHERE cv.trang_thai_id = ts.id AND cv.trang_thai IS NULL;

UPDATE public.qlcv_fact_cong_viec cv
SET loai_cong_viec = lc.ma
FROM public.qlcv_dm_loai_cong_viec lc
WHERE cv.loai_cong_viec_id = lc.id AND cv.loai_cong_viec IS NULL;

UPDATE public.qlcv_fact_cong_viec SET trang_thai = 'MOI' WHERE trang_thai IS NULL;
UPDATE public.qlcv_fact_cong_viec SET loai_cong_viec = 'DOT_XUAT' WHERE loai_cong_viec IS NULL;

-- Chuẩn hóa mã legacy lookup → SSOT app (zod: DINH_KY | DOT_XUAT | KHAN_CAP)
UPDATE public.qlcv_fact_cong_viec
SET loai_cong_viec = CASE
  WHEN loai_cong_viec IN ('DINH_KY', 'DOT_XUAT', 'KHAN_CAP') THEN loai_cong_viec
  WHEN loai_cong_viec IN ('DE_XUAT', 'THUONG', 'KHAC', 'NOI_BO', 'MANG_LUOI') THEN 'DOT_XUAT'
  ELSE 'DOT_XUAT'
END
WHERE loai_cong_viec IS NOT NULL;

ALTER TABLE public.qlcv_fact_cong_viec
  ALTER COLUMN trang_thai SET NOT NULL,
  ALTER COLUMN loai_cong_viec SET NOT NULL;

ALTER TABLE public.qlcv_fact_cong_viec DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_trang_thai_check;
ALTER TABLE public.qlcv_fact_cong_viec
  ADD CONSTRAINT qlcv_fact_cong_viec_trang_thai_check CHECK (
    trang_thai = ANY (ARRAY[
      'MOI','CHUA_BAT_DAU','CHO_NHAN_VIEC','DANG_LAM','DANG_THUC_HIEN',
      'CHO_XAC_NHAN_HOAN_THANH','CHO_DUYET','HOAN_THANH','TU_CHOI','QUA_HAN','DA_HUY'
    ]::text[])
  );

ALTER TABLE public.qlcv_fact_cong_viec DROP CONSTRAINT IF EXISTS qlcv_fact_cong_viec_loai_check;
ALTER TABLE public.qlcv_fact_cong_viec
  ADD CONSTRAINT qlcv_fact_cong_viec_loai_check CHECK (
    loai_cong_viec = ANY (ARRAY['DINH_KY','DOT_XUAT','KHAN_CAP']::text[])
  );

CREATE OR REPLACE FUNCTION public.fn_qlcv_sync_code_from_fk()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF NEW.trang_thai_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.trang_thai_id IS DISTINCT FROM OLD.trang_thai_id) THEN
    SELECT ma INTO NEW.trang_thai FROM public.qlcv_dm_trang_thai_cong_viec WHERE id = NEW.trang_thai_id;
  END IF;
  IF NEW.loai_cong_viec_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.loai_cong_viec_id IS DISTINCT FROM OLD.loai_cong_viec_id) THEN
    SELECT ma INTO NEW.loai_cong_viec FROM public.qlcv_dm_loai_cong_viec WHERE id = NEW.loai_cong_viec_id;
  END IF;
  IF NEW.trang_thai IS NOT NULL AND (NEW.trang_thai_id IS NULL OR TG_OP = 'INSERT') THEN
    SELECT id INTO NEW.trang_thai_id FROM public.qlcv_dm_trang_thai_cong_viec WHERE ma = NEW.trang_thai LIMIT 1;
  END IF;
  IF NEW.loai_cong_viec IS NOT NULL AND (NEW.loai_cong_viec_id IS NULL OR TG_OP = 'INSERT') THEN
    SELECT id INTO NEW.loai_cong_viec_id FROM public.qlcv_dm_loai_cong_viec WHERE ma = NEW.loai_cong_viec LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qlcv_sync_code_from_fk ON public.qlcv_fact_cong_viec;
CREATE TRIGGER trg_qlcv_sync_code_from_fk
  BEFORE INSERT OR UPDATE ON public.qlcv_fact_cong_viec
  FOR EACH ROW EXECUTE FUNCTION public.fn_qlcv_sync_code_from_fk();

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id, cv.cong_viec_cha_id, cv.tieu_de, cv.mo_ta,
  cv.loai_cong_viec_id, cv.loai_cong_viec,
  lc.ten AS ten_loai_cong_viec,
  cv.trang_thai_id, cv.trang_thai,
  ts.ten AS ten_trang_thai_hien_thi,
  cv.muc_do_uu_tien, cv.han_hoan_thanh, cv.phan_tram_hoan_thanh,
  cv.nguoi_tao_id, cv.nguoi_giao_viec_id, cv.nguoi_phu_trach_id,
  cv.khoa_thuc_hien_id, cv.to_cong_tac_id, cv.dinh_ky_mau_id,
  cv.is_active, cv.created_at, cv.updated_at,
  ns_tao.ho_ten AS nguoi_tao_ten, ns_phu.ho_ten AS nguoi_phu_trach_ten, ns_giao.ho_ten AS nguoi_giao_ten,
  k.ten_khoa AS khoa_thuc_hien_ten, t.ten_to AS to_cong_tac_ten,
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  (SELECT count(*)::integer FROM public.qlcv_fact_cong_viec sub
   WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count,
  cv.checklist
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.ma = cv.loai_cong_viec
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.ma = cv.trang_thai
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_tt text;
  anchor_months int;
  due_months int;
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
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      ELSE CONTINUE;
    END CASE;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    v_tt := CASE WHEN r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN 'DANG_LAM' ELSE 'MOI' END;

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true, public.fn_qlcv_mo_ta_to_checklist(r.mo_ta)
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$function$;

NOTIFY pgrst, 'reload schema';

COMMIT;
