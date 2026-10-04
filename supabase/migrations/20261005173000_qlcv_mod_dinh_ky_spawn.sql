-- Soft-local MOD-QLCV · QLCV-08 (CHƯA apply).
-- ngay_ket_thuc trên mẫu; spawn: phụ trách bắt buộc → DANG_LAM; ngày 29–31 → cuối tháng.

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS ngay_ket_thuc date NULL;

COMMENT ON COLUMN public.qlcv_fact_cong_viec_dinh_ky.ngay_ket_thuc IS
  'QLCV-08: ngày dừng sinh phiếu (NULL = không giới hạn; vẫn có nút tắt mẫu).';

CREATE OR REPLACE FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  inserted int := 0;
  r record;
  due date := public.fn_qlcv_today_vn();
  match_due boolean;
  v_tt text;
  anchor_months int;
  due_months int;
  v_rows int;
  anchor_day int;
  last_day int;
BEGIN
  FOR r IN SELECT * FROM public.qlcv_fact_cong_viec_dinh_ky WHERE is_active = true LOOP
    IF r.ngay_bat_dau > due THEN CONTINUE; END IF;
    IF r.ngay_ket_thuc IS NOT NULL AND due > r.ngay_ket_thuc THEN CONTINUE; END IF;
    -- QLCV-08: mẫu active phải có phụ trách (spawn bỏ qua nếu thiếu — tránh phiếu MOI rác)
    IF r.nguoi_phu_trach_id IS NULL THEN CONTINUE; END IF;

    match_due := false;
    anchor_day := extract(day from r.ngay_bat_dau::timestamp)::int;
    last_day := extract(day from (date_trunc('month', due::timestamp) + interval '1 month - 1 day'))::int;

    CASE r.ma_chu_ky
      WHEN 'DAILY' THEN match_due := true;
      WHEN 'WEEKLY' THEN match_due := mod((due - r.ngay_bat_dau)::integer, 7) = 0;
      WHEN 'MONTHLY' THEN
        match_due := extract(day from due::timestamp)::int = least(anchor_day, last_day);
      WHEN 'QUARTERLY' THEN
        IF extract(day from due::timestamp)::int = least(anchor_day, last_day) THEN
          anchor_months := date_part('year', r.ngay_bat_dau)::int * 12 + date_part('month', r.ngay_bat_dau::timestamp)::int;
          due_months := date_part('year', due)::int * 12 + date_part('month', due::timestamp)::int;
          match_due := mod(due_months - anchor_months, 3) = 0;
        END IF;
      WHEN 'YEARLY' THEN
        match_due :=
          extract(month from due::timestamp) = extract(month from r.ngay_bat_dau::timestamp)
          AND extract(day from due::timestamp)::int = least(
            extract(day from r.ngay_bat_dau::timestamp)::int,
            last_day
          );
      ELSE CONTINUE;
    END CASE;
    IF NOT match_due THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due AND c.is_active = true
    ) THEN CONTINUE; END IF;

    v_tt := 'DANG_LAM';

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec, trang_thai, muc_do_uu_tien, han_hoan_thanh,
      ngay_thuc_hien, gio_bat_dau, gio_ket_thuc, dia_diem_khoa_id,
      nguoi_phu_trach_id, to_cong_tac_id, dinh_ky_mau_id,
      nhiem_vu_id,
      vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      due, r.gio_bat_dau, r.gio_ket_thuc, r.dia_diem_khoa_id,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
      r.nhiem_vu_id,
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

GRANT EXECUTE ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

COMMENT ON FUNCTION public.fn_qlcv_fact_cong_viec_spawn_dinh_ky_hom_nay() IS
  'QLCV-08: ngày VN + ngay_ket_thuc; MONTHLY/QUARTERLY/YEARLY clamp ngày cuối tháng; bắt phụ trách.';

NOTIFY pgrst, 'reload schema';
