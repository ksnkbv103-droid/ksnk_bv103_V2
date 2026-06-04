/**
 * Ánh xạ tên bảng Postgres master → mã module trong `permission-registry.ts`.
 */

const MASTER_TABLE_MODULE: Record<string, string> = {
  gstt_dm_bang_kiem: "BANG_KIEM",
  danh_muc_bang_kiem: "BANG_KIEM",
  tieu_chi_bang_kiem: "BANG_KIEM_DETAIL",
  cssd_dm_hoa_chat: "HOA_CHAT",
  cssd_dm_loai_dung_cu: "LOAI_DC",
  mdm_dm_khoa_phong: "KHOA_PHONG",
  cssd_dm_bo_dung_cu: "BO_DC",
  cssd_dm_thiet_bi: "THIET_BI",
  cssd_dm_bo_dung_cu_chi_tiet: "DC_LE",
  mdm_nhan_su: "NHAN_SU",
  mdm_dm_khoi_khoa: "DANH_MUC",
  cssd_dm_tram: "DANH_MUC",
  mdm_dm_to_cong_tac: "DANH_MUC",
  mdm_dm_chuc_vu: "DANH_MUC",
  mdm_dm_chuc_danh: "DANH_MUC",
  sys_roles: "PHAN_QUYEN",
  gstt_dm_khu_vuc_giam_sat: "DANH_MUC",
  mdm_dm_nghe_nghiep: "DANH_MUC",
  cssd_dm_loai_su_co: "DANH_MUC",
  cssd_dm_loai_may: "DANH_MUC",
  gstt_dm_hinh_thuc_giam_sat: "DANH_MUC",
  gstt_dm_cach_thuc_giam_sat: "DANH_MUC",
  qlcv_dm_loai_cong_viec: "CONG_VIEC",
  qlcv_dm_trang_thai_cong_viec: "CONG_VIEC",
  nkbv_dm_loai: "GIAM_SAT_NKBV",
  nkbv_dm_trang_thai_ca: "GIAM_SAT_NKBV",
};

export function getRegistryModuleForMasterTable(tableName: string): string | null {
  return MASTER_TABLE_MODULE[tableName] ?? null;
}
