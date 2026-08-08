-- QLCV A+2: gỡ Kế hoạch năm (chuong_trinh) + Phân công tuần + Mốc;
-- nhiệm vụ đứng độc lập; wipe data thử nghiệm lớp liên quan.
BEGIN;

-- ── 1) Drop views / RPC tuần (phụ thuộc cột sắp gỡ) ─────────────────────────
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_qua_han;
DROP VIEW IF EXISTS public.v_qlcv_cong_viec_full;

DROP FUNCTION IF EXISTS public.fn_qlcv_ke_hoach_tuan_publish(uuid, uuid);

-- ── 2) Gỡ FK phiếu → dòng tuần (cho phép drop bảng tuần) ───────────────────
ALTER TABLE public.qlcv_fact_cong_viec
  DROP CONSTRAINT IF EXISTS fk_qlcv_fact_cv_ke_hoach_dong;

-- ── 3) Wipe + drop bảng tuần ────────────────────────────────────────────────
TRUNCATE TABLE public.qlcv_fact_ke_hoach_tuan_dong CASCADE;
TRUNCATE TABLE public.qlcv_fact_ke_hoach_tuan CASCADE;
DROP TABLE IF EXISTS public.qlcv_fact_ke_hoach_tuan_dong CASCADE;
DROP TABLE IF EXISTS public.qlcv_fact_ke_hoach_tuan CASCADE;

-- ── 4) Null / wipe phiếu + định kỳ + mốc + nhiệm vụ + kế hoạch năm ───────────
UPDATE public.qlcv_fact_cong_viec
SET ke_hoach_tuan_dong_id = NULL,
    moc_id = NULL,
    chuong_trinh_id = NULL
WHERE ke_hoach_tuan_dong_id IS NOT NULL
   OR moc_id IS NOT NULL
   OR chuong_trinh_id IS NOT NULL;

UPDATE public.qlcv_fact_cong_viec_dinh_ky
SET moc_id = NULL
WHERE moc_id IS NOT NULL;

TRUNCATE TABLE public.qlcv_fact_cong_viec CASCADE;
TRUNCATE TABLE public.qlcv_fact_cong_viec_dinh_ky CASCADE;
TRUNCATE TABLE public.qlcv_fact_nhiem_vu_moc CASCADE;
TRUNCATE TABLE public.qlcv_fact_nhiem_vu CASCADE;
TRUNCATE TABLE public.qlcv_fact_chuong_trinh CASCADE;

-- ── 5) Drop cột FK trên phiếu / định kỳ ─────────────────────────────────────
DROP INDEX IF EXISTS public.idx_qlcv_fact_cv_ke_hoach_dong;
DROP INDEX IF EXISTS public.idx_qlcv_cv_moc;
DROP INDEX IF EXISTS public.idx_qlcv_fact_cv_chuong_trinh;

ALTER TABLE public.qlcv_fact_cong_viec
  DROP COLUMN IF EXISTS ke_hoach_tuan_dong_id,
  DROP COLUMN IF EXISTS moc_id,
  DROP COLUMN IF EXISTS chuong_trinh_id;

ALTER TABLE public.qlcv_fact_cong_viec_dinh_ky
  DROP COLUMN IF EXISTS moc_id;

-- ── 6) Drop mốc + tách vụ bỏ ke_hoach_id + drop chuong_trinh ────────────────
DROP TABLE IF EXISTS public.qlcv_fact_nhiem_vu_moc CASCADE;

DROP INDEX IF EXISTS public.idx_qlcv_nv_ke_hoach;

ALTER TABLE public.qlcv_fact_nhiem_vu
  DROP CONSTRAINT IF EXISTS qlcv_fact_nhiem_vu_ke_hoach_id_fkey;

ALTER TABLE public.qlcv_fact_nhiem_vu
  DROP COLUMN IF EXISTS ke_hoach_id;

COMMENT ON TABLE public.qlcv_fact_nhiem_vu IS
  'Nhiệm vụ KSNK độc lập (năm/quý/tháng/hạn) — gắn tuỳ chọn lên phiếu công việc.';

DROP TABLE IF EXISTS public.qlcv_fact_chuong_trinh CASCADE;

-- ── 7) View phiếu (không năm/tuần/mốc) ───────────────────────────────────────
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
  cv.dia_diem_khoa_id,
  kp.ma_khoa AS dia_diem_khoa_ma,
  kp.ten_khoa AS dia_diem_khoa_ten,
  cv.nhiem_vu_id,
  nv.ten AS nhiem_vu_ten,
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
LEFT JOIN public.qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full WHERE is_qua_han = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

-- ── 8) Spawn định kỳ: chỉ copy nhiem_vu_id (không chuong_trinh / moc) ────────
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

COMMIT;
