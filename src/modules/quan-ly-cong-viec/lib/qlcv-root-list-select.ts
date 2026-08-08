/**
 * Cột view `v_qlcv_cong_viec_full` cho danh sách gốc (is_active).
 * Chuỗi literal `as const` để Supabase suy luận Result (không dùng `.join()` → `string`).
 */
export const QLCV_ROOT_TASK_VIEW_SELECT =
  "id,tieu_de,mo_ta,loai_cong_viec,muc_do_uu_tien,trang_thai,trang_thai_mau_sac,han_hoan_thanh,ngay_thuc_hien,gio_bat_dau,gio_ket_thuc,dia_diem_khoa_id,dia_diem_khoa_ma,dia_diem_khoa_ten,nhiem_vu_id,nhiem_vu_ten,phan_tram_hoan_thanh,nguoi_tao_id,nguoi_giao_viec_id,nguoi_phu_trach_id,to_cong_tac_id,dinh_ky_mau_id,vi_tri_thuc_hien,nguoi_phoi_hop_ids,nguoi_theo_doi_ids,is_active,created_at,updated_at,nguoi_tao_ten,nguoi_phu_trach_ten,nguoi_giao_ten,to_cong_tac_ten,is_qua_han" as const;
