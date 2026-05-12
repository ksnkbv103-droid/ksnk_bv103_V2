/**
 * Nhân sự - Module Types
 */

export interface NhanSu {
  id: string;
  ho_ten: string;
  ma_nv: string;
  email?: string | null;
  so_dien_thoai?: string | null;
  is_active: boolean;
  created_at: string;
  
  khoa_id?: string | null;
  to_id?: string | null;
  chuc_vu_id?: string | null;
  chuc_danh_id?: string | null;
  nghe_nghiep_id?: string | null;
  vai_tro_he_thong_id?: string | null;
  /** ISO date (YYYY-MM-DD) hoặc null */
  ngay_sinh?: string | null;
  gioi_tinh?: string | null;
  extra_data?: Record<string, unknown>;

  // UI Enrichment Objects
  khoa?: { id: string; ten_khoa: string };
  to?: { id: string; ten_danh_muc: string };
  nghe_nghiep?: { id: string; ten_nghe_nghiep: string };
  chuc_danh?: string;
  chuc_vu?: string;
  vai_tro_he_thong_ksnk?: string;
}
