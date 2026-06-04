/**
 * Cột view `v_qlcv_cong_viec_full` cho danh sách gốc (is_active).
 * Chuỗi literal `as const` để Supabase suy luận Result (không dùng `.join()` → `string`).
 */
export const QLCV_ROOT_TASK_VIEW_SELECT =
  "id,tieu_de,mo_ta,loai_cong_viec,muc_do_uu_tien,trang_thai,trang_thai_mau_sac,han_hoan_thanh,phan_tram_hoan_thanh,nguoi_tao_id,nguoi_giao_viec_id,nguoi_phu_trach_id,khoa_thuc_hien_id,to_cong_tac_id,is_active,created_at,updated_at,nguoi_tao_ten,nguoi_phu_trach_ten,nguoi_giao_ten,khoa_thuc_hien_ten,to_cong_tac_ten,is_qua_han" as const;
