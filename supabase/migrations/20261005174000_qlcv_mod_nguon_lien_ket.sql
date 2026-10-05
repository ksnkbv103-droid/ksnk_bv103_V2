-- Soft-local MOD-QLCV · QLCV-12 (CHƯA apply).
-- Cột nguon_lien_ket jsonb — deep-link ngược về SC / GSC / NKBV.

ALTER TABLE public.qlcv_fact_cong_viec
  ADD COLUMN IF NOT EXISTS nguon_lien_ket jsonb NULL;

COMMENT ON COLUMN public.qlcv_fact_cong_viec.nguon_lien_ket IS
  'QLCV-12: {module: CSSD_SU_CO|GIAM_SAT|NKBV, id, ma?, label?} — nguồn tạo việc.';

-- View kèm cột mới (giữ CASE labels Wave3 + is_qua_han ngày VN).
CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_full WITH (security_invoker = true) AS
SELECT
  cv.id,
  cv.tieu_de,
  cv.mo_ta,
  cv.loai_cong_viec,
  CASE cv.loai_cong_viec
    WHEN 'DINH_KY' THEN 'Định kỳ'
    WHEN 'DOT_XUAT' THEN 'Đột xuất'
    WHEN 'KHAN_CAP' THEN 'Khẩn cấp'
    ELSE cv.loai_cong_viec
  END AS ten_loai_cong_viec,
  cv.trang_thai,
  CASE cv.trang_thai
    WHEN 'MOI' THEN 'Mới'
    WHEN 'DANG_LAM' THEN 'Đang làm'
    WHEN 'CHO_DUYET' THEN 'Chờ nghiệm thu'
    WHEN 'HOAN_THANH' THEN 'Hoàn thành'
    WHEN 'TU_CHOI' THEN 'Từ chối'
    WHEN 'QUA_HAN' THEN 'Quá hạn'
    WHEN 'DA_HUY' THEN 'Đã hủy'
    WHEN 'CHUA_BAT_DAU' THEN 'Chưa bắt đầu'
    WHEN 'DANG_THUC_HIEN' THEN 'Đang thực hiện'
    ELSE cv.trang_thai
  END AS ten_trang_thai_hien_thi,
  CASE cv.trang_thai
    WHEN 'MOI' THEN '#94A3B8'
    WHEN 'DANG_LAM' THEN '#3B82F6'
    WHEN 'CHO_DUYET' THEN '#F59E0B'
    WHEN 'HOAN_THANH' THEN '#10B981'
    WHEN 'TU_CHOI' THEN '#EF4444'
    WHEN 'QUA_HAN' THEN '#DC2626'
    WHEN 'DA_HUY' THEN '#6B7280'
    WHEN 'CHUA_BAT_DAU' THEN '#6B7280'
    WHEN 'DANG_THUC_HIEN' THEN '#3B82F6'
    WHEN 'CHO_NHAN_VIEC' THEN '#3B82F6'
    WHEN 'CHO_XAC_NHAN_HOAN_THANH' THEN '#F59E0B'
    ELSE NULL
  END AS trang_thai_mau_sac,
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
    AND cv.han_hoan_thanh < public.fn_qlcv_today_vn()
    AND cv.trang_thai <> ALL (ARRAY['HOAN_THANH'::text, 'DA_HUY'::text])
  ) AS is_qua_han,
  cv.checklist,
  cv.nhat_ky,
  cv.analytics_meta,
  cv.nguon_lien_ket
FROM public.qlcv_fact_cong_viec cv
LEFT JOIN public.mdm_nhan_su ns_tao ON cv.nguoi_tao_id = ns_tao.id
LEFT JOIN public.mdm_nhan_su ns_phu ON cv.nguoi_phu_trach_id = ns_phu.id
LEFT JOIN public.mdm_nhan_su ns_giao ON cv.nguoi_giao_viec_id = ns_giao.id
LEFT JOIN public.mdm_dm_to_cong_tac t ON cv.to_cong_tac_id = t.id
LEFT JOIN public.mdm_dm_khoa_phong kp ON cv.dia_diem_khoa_id = kp.id
LEFT JOIN public.qlcv_fact_nhiem_vu nv ON cv.nhiem_vu_id = nv.id;

CREATE OR REPLACE VIEW public.v_qlcv_cong_viec_qua_han WITH (security_invoker = true) AS
SELECT * FROM public.v_qlcv_cong_viec_full
WHERE is_qua_han = true AND coalesce(is_active, true) = true;

GRANT SELECT ON public.v_qlcv_cong_viec_full TO anon, authenticated, service_role;
GRANT SELECT ON public.v_qlcv_cong_viec_qua_han TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
