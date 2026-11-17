/**
 * Ánh xạ tên bảng Postgres master → mã module trong `permission-registry.ts`.
 */

const MASTER_TABLE_MODULE: Record<string, string> = {
  gstt_dm_bang_kiem: "BANG_KIEM",
  cssd_dm_hoa_chat: "HOA_CHAT",
  cssd_dm_loai_dung_cu: "LOAI_DC",
  mdm_dm_khoa_phong: "KHOA_PHONG",
  cssd_dm_bo_dung_cu: "BO_DC",
  cssd_dm_thiet_bi: "THIET_BI",
  cssd_dm_bo_dung_cu_chi_tiet: "DC_LE",
  mdm_nhan_su: "NHAN_SU",
  mdm_dm_khoi_khoa: "DANH_MUC_ORG",
  cssd_dm_tram: "CSSD_WORKFLOW",
  mdm_dm_to_cong_tac: "DANH_MUC_ORG",
  mdm_dm_chuc_vu: "DANH_MUC_ORG",
  mdm_dm_chuc_danh: "DANH_MUC_ORG",
  sys_roles: "PHAN_QUYEN",
  gstt_dm_khu_vuc_giam_sat: "GIAM_SAT_CHUNG",
  mdm_dm_nghe_nghiep: "DANH_MUC_ORG",
  cssd_dm_loai_su_co: "CSSD_WORKFLOW",
  cssd_dm_loai_may: "CSSD_WORKFLOW",
  gstt_dm_hinh_thuc_giam_sat: "GIAM_SAT_CHUNG",
  gstt_dm_cach_thuc_giam_sat: "GIAM_SAT_CHUNG",
  nkbv_dm_loai: "GIAM_SAT_NKBV",
  nkbv_dm_trang_thai_ca: "GIAM_SAT_NKBV",
};

/** AR-8h: lookup thuộc module nghiệp vụ — quyền ghi module KHÔNG mở ghi danh mục (chỉ ADMIN). */
export const LOOKUP_ADMIN_ONLY_WRITE_OWNERS: ReadonlySet<string> = new Set([
  "GIAM_SAT_CHUNG",
  "CSSD_WORKFLOW",
  "GIAM_SAT_NKBV",
]);

const LOOKUP_WRITE_ACTIONS = new Set(["create", "edit", "delete", "import"]);

/** Ghi lookup thuộc module nghiệp vụ → bắt buộc ADMIN. */
export function isAdminOnlyLookupWrite(moduleKey: string, action: string): boolean {
  return LOOKUP_ADMIN_ONLY_WRITE_OWNERS.has(moduleKey.trim()) && LOOKUP_WRITE_ACTIONS.has(action.trim().toLowerCase());
}

export function getRegistryModuleForMasterTable(tableName: string): string | null {
  return MASTER_TABLE_MODULE[tableName] ?? null;
}
