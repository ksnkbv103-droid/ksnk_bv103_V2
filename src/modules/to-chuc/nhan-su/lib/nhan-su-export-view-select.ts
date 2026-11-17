/**
 * Cột view `v_mdm_nhan_su_full` — export + danh sách phân trang (`getNhanSus`).
 * Literal `as const` để Supabase suy luận Result (không `.join()` → `string`).
 * Khớp migration `20260716013_vst_mdm_phase2_drop_denorm.sql`.
 */
export const NHAN_SU_EXPORT_VIEW_SELECT =
  "id,ma_nv,ho_ten,khoa_id,to_id,nghe_nghiep_id,chuc_vu_id,chuc_danh_id,vai_tro_he_thong_id,auth_user_id,ngay_sinh,gioi_tinh,so_dien_thoai,email,extra_data,is_active,chuc_vu,chuc_danh,vai_tro_he_thong_ksnk,ten_khoa,ten_to,ten_nghe_nghiep,ten_chuc_vu,ten_chuc_danh,ten_vai_tro,created_at,updated_at" as const;
