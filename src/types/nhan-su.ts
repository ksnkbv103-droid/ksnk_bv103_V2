// src/types/nhan-su.ts

export interface NhanSu {
  id: string;
  ma_nv: string;
  ho_ten: string;
  khoa_id?: string | null;
  to_id?: string | null;
  chuc_vu?: string;
  chuc_vu_id?: string | null;
  chuc_danh?: string;
  chuc_danh_id?: string | null;
  vai_tro_he_thong_ksnk?: string | null;
  vai_tro_he_thong_id?: string | null;
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  so_dien_thoai?: string | null;
  email?: string | null;
  is_active?: boolean;
  extra_data?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  khoa?: KhoaMinimal;
  to?: {
    ten_danh_muc: string;
  };
  nghe_nghiep_id?: string | null;
  nghe_nghiep?: {
    ten_nghe_nghiep: string;
  };
}

export interface KhoaMinimal {
  id?: string;
  ten_khoa?: string;
  ma_khoa?: string;
}

export interface StaffAuthRow {
  id: string;
  ma_nv: string;
  ho_ten: string | null;
  email: string | null;
  is_active: boolean | null;
  auth_user_id: string | null;
  role_names: string[];
}
