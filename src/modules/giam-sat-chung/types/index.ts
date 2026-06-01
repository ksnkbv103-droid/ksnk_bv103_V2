/**
 * Giám sát chung - Module Types
 * 
 * SSOT for GSC domain types, including session data and history rows.
 * Reference: AGENTS.md 5d (Contract-First)
 */

export type ChecklistResultValue = "DAT" | "KHONG_DAT" | "NA";

/**
 * Slice 1 (giam-sat-tuan-thu reform v4 / JCI 8.0): metadata bảng kiểm.
 * Khớp 5 cột mới ở `gstt_dm_bang_kiem` — NULL-able, có CHECK constraint ở DB.
 */
export type BangKiemPhanLoaiChuyenMon =
  | "PHONG_NGUA_CHUAN"
  | "GOI_CAN_THIEP"
  | "XU_LY_DUNG_CU"
  | "MOI_TRUONG_CHAT_THAI"
  | "CHUYEN_KHOA";

export type BangKiemLoaiGiamSat = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG";

export type BangKiemDoiTuongGiamSat =
  | "NHAN_VIEN"
  | "NGUOI_BENH"
  | "MOI_TRUONG"
  | "THIET_BI"
  | "ME_TIET_KHUAN";

export type BangKiemCachTinhDiem = "TY_LE" | "TRON_GOI" | "DAT_KHONG_DAT" | "NHAT_KY";

export interface BangKiemMetadataV4 {
  phan_loai_chuyen_mon?: BangKiemPhanLoaiChuyenMon | null;
  loai_giam_sat?: BangKiemLoaiGiamSat | null;
  doi_tuong_giam_sat?: BangKiemDoiTuongGiamSat | null;
  cach_tinh_diem?: BangKiemCachTinhDiem | null;
  phien_ban?: string | null;
}

const BANG_KIEM_LOAI_GIAM_SAT_LABEL: Record<BangKiemLoaiGiamSat, string> = {
  TUAN_THU: "Giám sát tuân thủ",
  NHAT_KY_VAN_HANH: "Nhật ký vận hành",
  DANH_GIA_HE_THONG: "Đánh giá hệ thống",
};

const BANG_KIEM_CACH_TINH_DIEM_LABEL: Record<BangKiemCachTinhDiem, string> = {
  TY_LE: "Tỷ lệ phần trăm (%)",
  TRON_GOI: "Trọn gói (Care Bundle)",
  DAT_KHONG_DAT: "Đạt / Không đạt",
  NHAT_KY: "Nhật ký vận hành",
};

export interface ChecklistResult {
  criterionId: string;
  value: ChecklistResultValue;
  note?: string | null;
  weightType?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  isRedFlag?: boolean;
  image_url?: string | null; // Đường dẫn ảnh bằng chứng sai phạm
  thoi_diem_ghi?: string | null;
  gia_tri_so?: number | null;
  gia_tri_lua_chon?: string | null;
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
