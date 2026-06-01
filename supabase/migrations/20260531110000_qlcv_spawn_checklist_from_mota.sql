-- Spawn định kỳ: checklist từ mô tả mẫu (mỗi dòng = một mục)

CREATE OR REPLACE FUNCTION public.fn_qlcv_mo_ta_to_checklist(p_mo_ta text) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'label', trim(both from line),
        'done', false
      )
      ORDER BY ord
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      ord,
      regexp_replace(
        regexp_replace(trim(both from t.line), '^[-*•]\s+', ''),
        '^\d+[.)]\s+',
        ''
      ) AS line
    FROM regexp_split_to_table(COALESCE(p_mo_ta, ''), E'\n') WITH ORDINALITY AS t(line, ord)
  ) sub
  WHERE trim(both from line) <> '';
$$;

CREATE OR REPLACE FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO public
    AS $$
DECLARE
  inserted int := 0;
  r record;
  due date := CURRENT_DATE;
  match_due boolean;
  v_loai_id uuid;
  v_tt_id uuid;
  v_checklist jsonb;
  anchor_months int;
  due_months int;
BEGIN
  SELECT id INTO v_loai_id FROM public.dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;

  FOR r IN SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;

    match_due := false;
    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN
        match_due := true;
      WHEN 'WEEKLY' THEN
        match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN
        match_due := extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      ELSE
        CONTINUE;
    END CASE;

    IF NOT match_due THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    IF r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN
      SELECT id INTO v_tt_id FROM public.dm_trang_thai_cong_viec WHERE ma = 'DANG_LAM' LIMIT 1;
    ELSE
      SELECT id INTO v_tt_id FROM public.dm_trang_thai_cong_viec WHERE ma = 'MOI' LIMIT 1;
    END IF;

    v_checklist := public.fn_qlcv_mo_ta_to_checklist(r.mo_ta);

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true, v_checklist
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

NOTIFY pgrst, 'reload schema';
