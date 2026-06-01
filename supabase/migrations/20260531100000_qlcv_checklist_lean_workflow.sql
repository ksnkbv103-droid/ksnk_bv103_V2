-- QLCV lean workflow: checklist JSONB + view expose; backfill assigned → DANG_LAM
ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.checklist IS
  'Danh sách mục việc (tick 1 chạm). Mảng [{id,label,done}]. % hoàn thành sync từ checklist khi cập nhật.';

-- Giao việc đã có phụ trách nhưng còn MOI/CHO_NHAN → DANG_LAM (bỏ cổng nhận việc thủ công)
UPDATE public.qlcv_fact_cong_viec cv
SET trang_thai_id = ts_dang.id,
    updated_at = now()
FROM public.qlcv_dm_trang_thai_cong_viec ts_moi,
     public.qlcv_dm_trang_thai_cong_viec ts_dang
WHERE cv.is_active = true
  AND cv.nguoi_phu_trach_id IS NOT NULL
  AND ts_moi.ma IN ('MOI', 'CHUA_BAT_DAU', 'CHO_NHAN_VIEC')
  AND ts_dang.ma = 'DANG_LAM'
  AND cv.trang_thai_id = ts_moi.id
  AND cv.trang_thai_id IS DISTINCT FROM ts_dang.id;

CREATE OR REPLACE VIEW public.fact_cong_viec WITH (security_invoker = true) AS
 SELECT id,
    tieu_de,
    mo_ta,
    muc_do_uu_tien,
    han_hoan_thanh,
    nguoi_tao_id,
    nguoi_phu_trach_id,
    khoa_thuc_hien_id,
    to_cong_tac_id,
    cong_viec_cha_id,
    is_active,
    created_at,
    updated_at,
    phan_tram_hoan_thanh,
    nguoi_giao_viec_id,
    dinh_ky_mau_id,
    loai_cong_viec_id,
    trang_thai_id,
    hoan_thanh_luc,
    gia_han_so_lan,
    checklist
   FROM public.qlcv_fact_cong_viec;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
 SELECT cv.id,
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
    ((cv.han_hoan_thanh IS NOT NULL) AND (cv.han_hoan_thanh < CURRENT_DATE) AND (COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text]))) AS is_qua_han,
    ( SELECT count(*)::integer AS count
           FROM public.qlcv_fact_cong_viec sub
          WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true) AS cong_viec_con_count,
    cv.checklist
   FROM public.qlcv_fact_cong_viec cv
     LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
     LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
     LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
     LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
     LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
     LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
     LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

-- Spawn định kỳ: DANG_LAM khi đã giao phụ trách + checklist rỗng
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
BEGIN
  SELECT id INTO v_loai_id FROM public.dm_loai_cong_viec WHERE ma = 'DINH_KY' LIMIT 1;

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
      SELECT 1 FROM public.qlcv_fact_cong_viec c
      WHERE c.dinh_ky_mau_id = r.id AND c.han_hoan_thanh = due
    ) THEN CONTINUE; END IF;

    IF r.nguoi_phu_trach_id IS NOT NULL OR r.to_cong_tac_id IS NOT NULL THEN
      SELECT id INTO v_tt_id FROM public.dm_trang_thai_cong_viec WHERE ma = 'DANG_LAM' LIMIT 1;
    ELSE
      SELECT id INTO v_tt_id FROM public.dm_trang_thai_cong_viec WHERE ma = 'MOI' LIMIT 1;
    END IF;

    INSERT INTO public.qlcv_fact_cong_viec (
      tieu_de, mo_ta, loai_cong_viec_id, trang_thai_id, muc_do_uu_tien, han_hoan_thanh,
      nguoi_phu_trach_id, khoa_thuc_hien_id, to_cong_tac_id, dinh_ky_mau_id,
      nguoi_tao_id, nguoi_giao_viec_id, phan_tram_hoan_thanh, is_active, checklist
    ) VALUES (
      r.tieu_de, r.mo_ta, v_loai_id, v_tt_id, coalesce(r.muc_do_uu_tien, 'TRUNG_BINH'), due,
      r.nguoi_phu_trach_id, r.khoa_thuc_hien_id, r.to_cong_tac_id, r.id,
      r.nguoi_tao_id, r.nguoi_tao_id, 0, true, '[]'::jsonb
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

NOTIFY pgrst, 'reload schema';
