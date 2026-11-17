/**
 * Hợp đồng Smart Import — allowlist bảng + unique key (SSOT).
 * Dùng chung gateway + `smart-import.actions`.
 */

export const SMART_IMPORT_TABLE_UNIQUE_KEY = {
  mdm_dm_khoa_phong: "ma_khoa",
  cssd_dm_bo_dung_cu_chi_tiet: "ma_chi_tiet",
  cssd_dm_loai_dung_cu: "ma_loai_dung_cu",
  cssd_dm_hoa_chat: "ma_hoa_chat",
  cssd_dm_bo_dung_cu: "ma_bo",
  cssd_dm_thiet_bi: "ma_thiet_bi",
  mdm_nhan_su: "ma_nv",
} as const;

export type SmartImportTable = keyof typeof SMART_IMPORT_TABLE_UNIQUE_KEY;

export type SmartImportOptions = {
  /** Chỉ true khi user chọn «Đồng bộ đầy đủ». Mặc định false = an toàn. */
  softDeleteMissing?: boolean;
  /** true = chuẩn bị + đếm, không ghi DB. */
  dryRun?: boolean;
};

export function isSmartImportTable(table: string): table is SmartImportTable {
  return Object.prototype.hasOwnProperty.call(SMART_IMPORT_TABLE_UNIQUE_KEY, table);
}
