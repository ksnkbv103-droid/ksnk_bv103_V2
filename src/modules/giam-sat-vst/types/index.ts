/**
 * Giám sát VST - Module Types
 * 
 * SSOT for VST domain types.
 * Reference: AGENTS.md 5d (Contract-First)
 */

export interface VstSessionHistoryRow {
  id: string;
  created_at: string;
  ngay_giam_sat: string;
  khoa_id: string;
  khu_vuc_id: string | null;
  nguoi_giam_sat_id: string;
  vi_tri_cu_the: string | null;
  hinh_thuc_giam_sat: string;
  cach_thuc_giam_sat: string;
  
  // Joined fields from view
  ten_khoa?: string;
  ten_khu_vuc?: string;
  ten_nguoi_giam_sat?: string;
  
  // Aggregated count from results
  count_observations?: number;
  ty_le_tuan_thu?: number;
}

export type VstFilters = {
  khoa_id?: string;
  tu_ngay?: string;
  den_ngay?: string;
};
