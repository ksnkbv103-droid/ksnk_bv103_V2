/**
 * Ánh xạ tên bảng Postgres master → mã module trong `permission-registry.ts`.
 */

const MASTER_TABLE_MODULE: Record<string, string> = {
  dm_bang_kiem: "BANG_KIEM",
  danh_muc_bang_kiem: "BANG_KIEM",
  tieu_chi_bang_kiem: "BANG_KIEM_DETAIL",
  dm_hoa_chat: "HOA_CHAT",
  dm_loai_dung_cu: "LOAI_DC",
  dm_khoa_phong: "KHOA_PHONG",
  dm_bo_dung_cu: "BO_DC",
  dm_thiet_bi: "THIET_BI",
  dm_bo_dung_cu_chi_tiet: "DC_LE",
  mdm_nhan_su: "NHAN_SU",
  dm_khoi_khoa: "DANH_MUC",
  dm_tram_cssd: "DANH_MUC",
  dm_to_cong_tac: "DANH_MUC",
  dm_chuc_vu: "DANH_MUC",
  dm_chuc_danh: "DANH_MUC",
  dm_roles: "PHAN_QUYEN",
  dm_khu_vuc_giam_sat: "DANH_MUC",
  dm_nghe_nghiep: "DANH_MUC",
  dm_loai_su_co: "DANH_MUC",
  dm_loai_may_tiet_khuan: "DANH_MUC",
  dm_hinh_thuc_giam_sat: "DANH_MUC",
  dm_cach_thuc_giam_sat: "DANH_MUC",
  dm_loai_cong_viec: "CONG_VIEC",
  dm_trang_thai_cong_viec: "CONG_VIEC",
  dm_loai_nkbv: "GIAM_SAT_NKBV",
  dm_trang_thai_nkbv_ca: "GIAM_SAT_NKBV",
  mdm_dm_khoa_phong: "KHOA_PHONG",
  cssd_dm_thiet_bi: "THIET_BI",
  cssd_dm_hoa_chat: "HOA_CHAT",
  cssd_dm_loai_dung_cu: "LOAI_DC",
  cssd_dm_bo_dung_cu: "BO_DC",
  cssd_dm_bo_dung_cu_chi_tiet: "DC_LE",
  gstt_dm_bang_kiem: "BANG_KIEM",
};

export function getRegistryModuleForMasterTable(tableName: string): string | null {
  return MASTER_TABLE_MODULE[tableName] ?? null;
}
