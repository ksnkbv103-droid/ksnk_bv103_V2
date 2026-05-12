/**
 * Anh xa ten bang Postgres master -> ma module trong `permission-registry.ts`
 * (ding cho verifyPermission trong import/export excel).
 */

const MASTER_TABLE_MODULE: Record<string, string> = {
  /** Bảng kiểm — import/export generic / master export (luồng riêng vẫn gọi verify trực tiếp) */
  dm_bang_kiem: "BANG_KIEM",
  dm_tieu_chi_bang_kiem: "BANG_KIEM_DETAIL",
  /** Legacy aliases: giữ tạm để tương thích ngược nếu còn màn cũ gọi. */
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
  dm_to_cong_tac: "DANH_MUC",
  dm_chuc_vu: "DANH_MUC",
  dm_chuc_danh: "DANH_MUC",
  dm_roles: "DANH_MUC",
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
};

export function getRegistryModuleForMasterTable(tableName: string): string | null {
  return MASTER_TABLE_MODULE[tableName] ?? null;
}
