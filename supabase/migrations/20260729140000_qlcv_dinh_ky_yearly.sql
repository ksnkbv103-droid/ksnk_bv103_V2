-- QLCV: chu kỳ YEARLY cho mẫu định kỳ + spawn RPC mirror.

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  DROP CONSTRAINT IF EXISTS "fact_cong_viec_dinh_ky_ma_chu_ky_check";

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD CONSTRAINT "fact_cong_viec_dinh_ky_ma_chu_ky_check"
  CHECK (ma_chu_ky = ANY (ARRAY[
    'DAILY'::text,
    'WEEKLY'::text,
    'MONTHLY'::text,
    'QUARTERLY'::text,
    'YEARLY'::text
  ]));

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
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      WHEN 'YEARLY' THEN
        -- Cùng ngày + cùng tháng trong năm (mốc MM-DD lặp mỗi năm)
        match_due :=
          extract(month from due::timestamp) = extract(month from r.ngay_bat_dau::timestamp)
          AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
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
      nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
      public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$function$;

COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'Sinh qlcv_fact_cong_viec từ mẫu định kỳ active; idempotent (dinh_ky_mau_id, han_hoan_thanh). Chu kỳ: DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY.';
