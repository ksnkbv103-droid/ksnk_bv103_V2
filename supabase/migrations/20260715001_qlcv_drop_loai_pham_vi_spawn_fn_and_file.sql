-- QLCV nội bộ KSNK: bỏ cột loai_pham_vi (chỉ còn nội bộ), cập nhật RPC sinh định kỳ,
-- gỡ bảng fact_cong_viec_file (module cũ, app không dùng).

DROP VIEW IF EXISTS public.v_cong_viec_qua_han CASCADE;
DROP VIEW IF EXISTS public.v_fact_cong_viec_full CASCADE;

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
BEGIN
  FOR r IN
    SELECT * FROM public.fact_cong_viec_dinh_ky WHERE is_active = true
  LOOP
    match_due := false;
    IF r.ma_chu_ky = 'WEEKLY' THEN
      match_due := (r.ngay_bat_dau <= due) AND mod((due - r.ngay_bat_dau)::integer, 7) = 0;
    ELSE
      match_due := (r.ngay_bat_dau <= due)
        AND extract(day from due::timestamp) = extract(day from r.ngay_bat_dau::timestamp);
    END IF;

    IF NOT match_due THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id
        AND c.han_hoan_thanh = due
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.fact_cong_viec (
      tieu_de,
      mo_ta,
      loai_cong_viec,
      muc_do_uu_tien,
      trang_thai,
      han_hoan_thanh,
      phan_tram_hoan_thanh,
      is_active,
      nguoi_phu_trach_id,
      to_cong_tac_id,
      nguoi_tao_id,
      dinh_ky_mau_id
    )
    VALUES (
      r.tieu_de,
      r.mo_ta,
      'DINH_KY',
      'TRUNG_BINH',
      'CHUA_BAT_DAU',
      due,
      0,
      true,
      r.nguoi_phu_trach_id,
      r.to_cong_tac_id,
      r.nguoi_tao_id,
      r.id
    );

    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay() TO service_role;

ALTER TABLE public.fact_cong_viec DROP COLUMN IF EXISTS loai_pham_vi;

CREATE VIEW public.v_fact_cong_viec_full AS
SELECT
  cv.*,
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
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE VIEW public.v_cong_viec_qua_han AS
SELECT * FROM public.v_fact_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_fact_cong_viec_full TO authenticated, service_role;
GRANT SELECT ON public.v_cong_viec_qua_han TO authenticated, service_role;

DROP TABLE IF EXISTS public.fact_cong_viec_file CASCADE;
