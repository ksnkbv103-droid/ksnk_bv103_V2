/**
 * View `v_gstt_giam_sat_chung_sessions_full`: fact + join hiển thị.
 * Phải là **chuỗi literal `as const`** (không `.join()`) để Supabase client suy luận Result,
 * tránh `GenericStringError` và không cần `as unknown` ở action.
 */

/** Lịch sử / phân trang: không tải `ghi_chu_chung` (thường dài). */
export const GSC_SESSIONS_FULL_LIST_SELECT =
  "id,loai_bang_kiem,loai_giam_sat,cach_tinh_diem,bang_kiem_id,khoa_id,khu_vuc_id,vi_tri,hinh_thuc_id,cach_thuc_id,hinh_thuc_giam_sat,cach_thuc_giam_sat,ma_hinh_thuc_giam_sat,ma_cach_thuc_giam_sat,ten_hinh_thuc_danh_muc,ten_cach_thuc_danh_muc,nguoi_giam_sat_id,is_giam_sat_ca_nhan,nhan_vien_id,nghe_nghiep_id,ngay_giam_sat,thoi_gian_ghi_nhan,tong_diem,tong_quan_sat,tong_dat,dat_tron_goi,du_lieu_nghi_van,is_active,created_at,updated_at,is_seen,thoi_gian_bat_dau,thoi_gian_ket_thuc,is_manual_nhan_vien,ten_manual_nhan_vien,is_bo_sung_nguoi_benh,ma_nguoi_benh,ten_nguoi_benh,so_giuong_nguoi_benh,ma_khoa_phong,ten_khoa_phong,ten_khu_vuc_giam_sat,ten_nguoi_giam_sat,ten_nhan_vien,ma_nhan_vien,ten_nghe_nghiep,ten_bang_kiem_hien_thi" as const;

export const GSC_SESSIONS_FULL_DETAIL_SELECT =
  "id,loai_bang_kiem,loai_giam_sat,khoa_id,khu_vuc_id,vi_tri,hinh_thuc_id,cach_thuc_id,hinh_thuc_giam_sat,cach_thuc_giam_sat,ma_hinh_thuc_giam_sat,ma_cach_thuc_giam_sat,ten_hinh_thuc_danh_muc,ten_cach_thuc_danh_muc,nguoi_giam_sat_id,is_giam_sat_ca_nhan,nhan_vien_id,nghe_nghiep_id,ngay_giam_sat,thoi_gian_ghi_nhan,tong_diem,is_active,created_at,updated_at,is_seen,thoi_gian_bat_dau,thoi_gian_ket_thuc,is_manual_nhan_vien,ten_manual_nhan_vien,is_bo_sung_nguoi_benh,ma_nguoi_benh,ten_nguoi_benh,so_giuong_nguoi_benh,ghi_chu_chung,ma_khoa_phong,ten_khoa_phong,ten_khu_vuc_giam_sat,ten_nguoi_giam_sat,ten_nhan_vien,ma_nhan_vien,ten_nghe_nghiep,ten_bang_kiem_hien_thi,results_jsonb" as const;

export const GSC_RESULTS_ROW_SELECT =
  "id,session_id,criterion_id,value,note,created_at" as const;
