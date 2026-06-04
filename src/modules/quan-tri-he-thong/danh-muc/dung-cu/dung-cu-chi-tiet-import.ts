/** Ánh xạ header Excel ↔ cột bả cssd_dm_bo_dung_cu_chi_tiet (import/export). */
export const DC_CHI_TIET_COLUMN_MAP: Record<string, string> = {
  "Mã chi tiết": "ma_chi_tiet",
  "Tên chi tiết": "ten_chi_tiet",
  "Mã bộ (cha)": "ma_bo_cha",
  "Tên bộ (cha)": "ten_bo_cha",
  "UUID bộ (tùy chọn)": "bo_dung_cu_id",
  "Mã loại dụng cụ": "ma_loai_dung_cu",
  "Tên loại dụng cụ": "ten_loai_dung_cu",
  "UUID loại (tùy chọn)": "loai_dung_cu_id",
  "Số lượng": "so_luong",
  "Giới hạn SUD": "max_suds_count",
  "Trọng lượng": "trong_luong",
  "Ghi chú": "ghi_chu",
  "Mã QR mẫu": "ma_qr_mau",
  is_active: "is_active",
};
