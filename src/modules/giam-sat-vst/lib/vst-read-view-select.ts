/**
 * View `v_fact_giam_sat_vst_sessions_full` + bảng `fact_giam_sat_vst`.
 * Literal `as const` để Supabase suy luận Result.
 */
export const VST_SESSIONS_FULL_VIEW_SELECT =
  "id,khoa_id,khu_vuc_id,vi_tri_cu_the,hinh_thuc_giam_sat,cach_thuc_giam_sat,nguoi_giam_sat_id,thoi_gian_bat_dau,thoi_gian_ket_thuc,ngay_giam_sat,created_at,updated_at,is_active,is_seen,ten_khoa_phong,ten_khu_vuc_giam_sat,ten_nguoi_giam_sat,tong_co_hoi,da_tuan_thu" as const;

export const VST_OBSERVATION_ROW_SELECT =
  "id,session_id,nhan_vien_id,ten_nhan_vien_ngoai,khoa_id,khu_vuc,vi_tri,nghe_nghiep,ngay_giam_sat,thoi_diem,hanh_dong,dung_ky_thuat,du_thoi_gian,co_deo_gang,thoi_gian_ghi_nhan,created_at" as const;
