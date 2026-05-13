/**
 * Giám sát chung - Module Types
 * 
 * SSOT for GSC domain types, including session data and history rows.
 * Reference: AGENTS.md 5d (Contract-First)
 */

export type ChecklistResultValue = "DAT" | "KHONG_DAT" | "NA";

export interface ChecklistResult {
  criterionId: string;
  value: ChecklistResultValue;
  note?: string | null;
}

export interface GscSessionHistoryRow {
  id: string;
  created_at: string;
  ngay_giam_sat: string | null;
  khoa_id: string;
  khu_vuc_id: string | null;
  nhan_vien_id: string | null;
  nguoi_giam_sat_id: string;
  tong_diem: number;
  hinh_thuc_giam_sat: string;
  cach_thuc_giam_sat: string;
  loai_bang_kiem: string | null;
  /** Có thể thiếu khi đọc list tối giản (không select `ghi_chu_chung`). */
  ghi_chu_chung?: string | null;
  
  // Joined fields from view
  ten_khoa?: string;
  ten_khoa_phong?: string;
  ten_khu_vuc?: string;
  ten_khu_vuc_giam_sat?: string;
  ho_ten_nhan_vien?: string;
  ten_nhan_vien?: string;
  ma_nhan_vien?: string;
  ten_nguoi_giam_sat?: string;
  ten_nghe_nghiep?: string;
  is_seen?: boolean;
  is_bo_sung_nguoi_benh?: boolean;
  ma_nguoi_benh?: string | null;
  ten_nguoi_benh?: string | null;
  so_giuong_nguoi_benh?: string | null;
}

export type GscFilters = {
  khoa_id?: string;
  tu_ngay?: string;
  den_ngay?: string;
};
