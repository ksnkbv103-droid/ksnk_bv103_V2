/**
 * Giám sát NKBV - Module Types
 * 
 * Reference: AGENTS.md 5d (Contract-First)
 */

export interface GiamSatNkbvCaRow {
  id: string;
  ma_ca: string;
  ho_ten_benh_nhan: string;
  ma_benh_nhan?: string | null;
  ngay_phat_hien: string;
  khoa_ghi_nhan_id: string;
  loai_nkbv_id: string;
  trang_thai_id: string;
  vi_tri_nhiem_khuan?: string | null;
  tac_nhan_vi_khuan?: string | null;
  nguoi_ghi_id?: string | null;
  created_at: string;
  
  // Joined fields
  ten_khoa?: string;
  ten_loai_nkbv?: string;
  ten_trang_thai?: string;
  ten_nguoi_ghi?: string;
}

export type NkbvFilters = {
  khoa_id?: string;
  loai_nkbv_id?: string;
  tu_ngay?: string;
  den_ngay?: string;
};
