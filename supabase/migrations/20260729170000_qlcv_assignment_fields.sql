-- QLCV: vị trí thực hiện + người phối hợp + người theo dõi (fact + mẫu định kỳ);
-- cập nhật view + spawn copy fields.

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS vi_tri_thuc_hien text,
  ADD COLUMN IF NOT EXISTS nguoi_phoi_hop_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS nguoi_theo_doi_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  ADD COLUMN IF NOT EXISTS vi_tri_thuc_hien text,
  ADD COLUMN IF NOT EXISTS nguoi_phoi_hop_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS nguoi_theo_doi_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.qlcv_fact_cong_viec.vi_tri_thuc_hien IS 'Vị trí thực hiện (text tùy biến).';
COMMENT ON COLUMN public.qlcv_fact_cong_viec.nguoi_phoi_hop_ids IS 'Danh sách nhân sự phối hợp (uuid[]).';
COMMENT ON COLUMN public.qlcv_fact_cong_viec.nguoi_theo_doi_ids IS 'Danh sách nhân sự theo dõi / giám sát (uuid[]).';

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
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

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
      vi_tri_thuc_hien, nguoi_phoi_hop_ids, nguoi_theo_doi_ids,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist, nhat_ky
    ) VALUES (
      r.tieu_de, r.mo_ta, 'DINH_KY', v_tt, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.to_cong_tac_id, r.id,
      r.vi_tri_thuc_hien, coalesce(r.nguoi_phoi_hop_ids, '{}'::uuid[]), coalesce(r.nguoi_theo_doi_ids, '{}'::uuid[]),
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true,
      public.fn_qlcv_mo_ta_to_checklist(r.mo_ta), '[]'::jsonb
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$function$;
