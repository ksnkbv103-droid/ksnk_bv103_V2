/**
 * Cột view `v_mdm_nhan_su_full` — export + danh sách phân trang (`getNhanSus`).
 * Literal `as const` để Supabase suy luận Result (không `.join()` → `string`).
 * Khớp migration `20260507013048_remote_schema.sql`.
 */
export const NHAN_SU_EXPORT_VIEW_SELECT =
  "id,ho_ten,ma_nv,khoa_id,is_active,created_at,updated_at,ngay_sinh,gioi_tinh,to_id,chuc_vu,chuc_danh,vai_tro_he_thong_ksnk,so_dien_thoai,email,extra_data,chuc_vu_id,chuc_danh_id,vai_tro_he_thong_id,auth_user_id,nghe_nghiep_id,ten_khoa,ten_nghe_nghiep,ten_chuc_danh,ten_chuc_vu,ten_to,ten_vai_tro" as const;
