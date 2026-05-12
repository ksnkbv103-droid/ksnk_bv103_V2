/**
 * Permission Registry Data (Configuration Only)
 * 
 * Separate declaration to keep the main registry logic under 180 lines.
 */

import { ModuleConfig } from "./permission-registry";

export const MODULE_REGISTRY: ModuleConfig[] = [
  {
    code: "DASHBOARD",
    displayName: "Bảng điều khiển (Dashboard)",
    actions: ["VIEW"],
  },
  {
    code: "DANH_MUC",
    displayName: "Quản trị Danh mục",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "NHAN_SU",
    displayName: "Quản lý Nhân sự",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "BANG_KIEM",
    displayName: "Danh mục Bảng kiểm",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "CONG_VIEC",
    displayName: "Quản lý Công việc",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT", "APPROVE"]
  },
  {
    code: "LOAI_DC",
    displayName: "Danh mục Loại dụng cụ",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "BO_DC",
    displayName: "Danh mục Bộ dụng cụ",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "DC_LE",
    displayName: "Danh mục Dụng cụ chi tiết",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "THIET_BI",
    displayName: "Danh mục Thiết bị",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "HOA_CHAT",
    displayName: "Danh mục Hóa chất",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "KHOA_PHONG",
    displayName: "Danh mục Khoa phòng",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "BANG_KIEM_DETAIL",
    displayName: "Tiêu chí Bảng kiểm",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "CSSD_REPORT",
    displayName: "CSSD - Báo cáo",
    actions: ["VIEW", "EXPORT"]
  },
  {
    code: "CSSD_KHO_DUNGCU",
    displayName: "CSSD - Kho Dụng cụ",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "CSSD_WORKFLOW",
    displayName: "CSSD - Quy trình (Luân chuyển QR)",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
  },
  {
    code: "CSSD_ME_TIET_KHUAN",
    displayName: "CSSD - Mẻ Tiệt khuẩn",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT", "QC", "LOCK"]
  },
  {
    code: "KSNK_KHO_HOACHAT",
    displayName: "KSNK - Kho hóa chất / vật tư",
    actions: ["VIEW", "CREATE", "EDIT", "EXPORT"]
  },
  {
    code: "GIAM_SAT_VST",
    displayName: "Giám sát Vệ sinh tay",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "GIAM_SAT_CHUNG",
    displayName: "Giám sát Bảng kiểm chung",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "GIAM_SAT_NKBV",
    displayName: "Giám sát Nhiễm khuẩn BV (NKBV / HAI)",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE", "IMPORT"]
  },
  {
    code: "PHAN_QUYEN",
    displayName: "Quản trị Phân quyền",
    actions: ["VIEW", "CREATE", "EDIT", "DELETE"]
  },
  {
    code: "BAO_SU_CO",
    displayName: "Báo cáo Sự cố",
    actions: ["VIEW", "CREATE"]
  },
];
