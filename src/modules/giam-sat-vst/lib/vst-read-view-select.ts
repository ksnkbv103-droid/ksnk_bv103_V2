/**
 * View `v_gstt_giam_sat_vst_sessions_full` + `v_gstt_giam_sat_vst_full`.
 * Literal `as const` để Supabase suy luận Result.
 */
export const VST_SESSIONS_FULL_VIEW_SELECT =
  "id,khoa_id,khu_vuc_id,vi_tri_cu_the,hinh_thuc_id,cach_thuc_id,hinh_thuc_giam_sat,cach_thuc_giam_sat,ma_hinh_thuc_giam_sat,ma_cach_thuc_giam_sat,ten_hinh_thuc_danh_muc,ten_cach_thuc_danh_muc,nguoi_giam_sat_id,thoi_gian_bat_dau,thoi_gian_ket_thuc,ngay_giam_sat,created_at,updated_at,is_active,is_seen,ma_khoa_phong,ten_khoa_phong,ten_khu_vuc_giam_sat,ten_nguoi_giam_sat,tong_co_hoi,da_tuan_thu" as const;

/** Đọc dòng quan sát — nhãn khu_vuc/nghe_nghiep từ JOIN (alias trên view). */
export const VST_OBSERVATION_FULL_VIEW_SELECT =
  "id,session_id,nhan_vien_id,ten_nhan_vien_ngoai,khoa_id,khu_vuc_id,nghe_nghiep_id,khu_vuc,nghe_nghiep,ten_khu_vuc_hien_thi,ten_nghe_nghiep_hien_thi,vi_tri,ngay_giam_sat,thoi_diem,hanh_dong,dung_ky_thuat,du_thoi_gian,co_deo_gang,thoi_gian_ghi_nhan,legacy_csv_row_id,ghi_chu,created_at" as const;
