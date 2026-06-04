-- Khôi phục view QLCV sau CASCADE từ 20260531140000 (DROP dm_to_cong_tac).
-- 20260531140100 chỉ recreate view CSSD/MDM khoa — thiếu v_qlcv_*.

BEGIN;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
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
  (
    cv.han_hoan_thanh IS NOT NULL
    AND cv.han_hoan_thanh < CURRENT_DATE
    AND COALESCE(ts.ma, ''::text) <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  (
    SELECT count(*)::integer
    FROM public.qlcv_fact_cong_viec sub
    WHERE sub.cong_viec_cha_id = cv.id AND sub.is_active = true
  ) AS cong_viec_con_count,
  cv.checklist
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.qlcv_dm_loai_cong_viec lc ON lc.id = cv.loai_cong_viec_id
LEFT JOIN public.qlcv_dm_trang_thai_cong_viec ts ON ts.id = cv.trang_thai_id
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_khoa_phong k ON cv.khoa_thuc_hien_id = k.id
LEFT JOIN public.dm_to_cong_tac t ON cv.to_cong_tac_id = t.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT
  id,
  cong_viec_cha_id,
  tieu_de,
  mo_ta,
  loai_cong_viec_id,
  loai_cong_viec,
  ten_loai_cong_viec,
  trang_thai_id,
  trang_thai,
  ten_trang_thai_hien_thi,
  muc_do_uu_tien,
  han_hoan_thanh,
  phan_tram_hoan_thanh,
  nguoi_tao_id,
  nguoi_giao_viec_id,
  nguoi_phu_trach_id,
  khoa_thuc_hien_id,
  to_cong_tac_id,
  dinh_ky_mau_id,
  is_active,
  created_at,
  updated_at,
  nguoi_tao_ten,
  nguoi_phu_trach_ten,
  nguoi_giao_ten,
  khoa_thuc_hien_ten,
  to_cong_tac_ten,
  is_qua_han,
  cong_viec_con_count,
  checklist
FROM public.v_qlcv_cong_viec_full
WHERE is_qua_han = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
