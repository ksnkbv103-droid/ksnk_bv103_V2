/**
 * CSSD ERP - Module Types
 * 
 * Reference: AGENTS.md 5d (Contract-First)
 */

export type CssdTrangThaiQuyTrinh = 
  | "DANG_THUC_HIEN" 
  | "CHO_TIET_KHUAN" 
  | "DANG_TIET_KHUAN" 
  | "HOAN_THANH" 
  | "HUY";

export interface CssdQuyTrinhRow {
  id: string;
  ma_quy_trinh: string;
  trang_thai: CssdTrangThaiQuyTrinh;
  khoa_id: string;
  nhan_vien_thuc_hien_id: string;
  loai_tiet_khuan: string;
  thoi_gian_bat_dau: string;
  thoi_gian_ket_thuc?: string | null;
  created_at: string;
  
  // Joined fields
  ten_khoa?: string;
  ten_nhan_vien?: string;
}

export interface CssdThanhPhanRow {
  id: string;
  quy_trinh_id: string;
  dm_dung_cu_id: string;
  so_luong: number;
  ten_dung_cu?: string;
  ma_dung_cu?: string;
}
