// src/lib/permission-registry.ts

/**
 * Định nghĩa cấu trúc Module trong hệ thống.
 */
export interface ModuleConfig {
  code: string;
  displayName: string;
  actions: string[];
}

export const MODULE_GROUPS = {
  SYSTEM: "Hệ thống & Quản trị",
  MASTER_DATA: "Danh mục Master Data",
  CSSD: "CSSD & Quản lý Kho",
  SUPERVISION: "Giám sát & Sự cố",
} as const;

export const MODULE_TO_GROUP: Record<string, keyof typeof MODULE_GROUPS> = {
  DASHBOARD: "SYSTEM",
  DANH_MUC: "SYSTEM",
  NHAN_SU: "SYSTEM",
  BANG_KIEM: "SYSTEM",
  CONG_VIEC: "SYSTEM",
  PHAN_QUYEN: "SYSTEM",

  LOAI_DC: "MASTER_DATA",
  BO_DC: "MASTER_DATA",
  DC_LE: "MASTER_DATA",
  THIET_BI: "MASTER_DATA",
  HOA_CHAT: "MASTER_DATA",
  KHOA_PHONG: "MASTER_DATA",
  BANG_KIEM_DETAIL: "MASTER_DATA",

  CSSD_REPORT: "CSSD",
  CSSD_KHO_DUNGCU: "CSSD",
  CSSD_WORKFLOW: "CSSD",
  CSSD_ME_TIET_KHUAN: "CSSD",
  KSNK_KHO_HOACHAT: "CSSD",

  GIAM_SAT_VST: "SUPERVISION",
  GIAM_SAT_CHUNG: "SUPERVISION",
  GIAM_SAT_NKBV: "SUPERVISION",
  BAO_SU_CO: "SUPERVISION",
};

/**
 * REGISTRY TRUNG TÂM (SSOT) - Chỉ cần khai báo ở đây để tự động cập nhật toàn hệ thống.
 * - displayName: Tên hiển thị trên giao diện Ma trận Phân quyền.
 * - actions: Danh sách quyền hạn (VIEW, CREATE, EDIT, DELETE, IMPORT, QC, LOCK).
 *
 * Lưu ý:
 * - Giữ cả key tổng quát và key chi tiết để tương thích code cũ + code mới.
 * - Khi bổ sung module mới, bắt buộc khai báo tại đây trước khi dùng trong UI/Action.
 */
import { MODULE_REGISTRY } from "./permission-registry-data";

/**
 * Chuyển đổi registry thành danh sách permission phẳng để đồng bộ DB
 */
export function getFlatPermissions() {
  const perms: { name: string; module_name: string; action: string; description: string }[] = [];

  MODULE_REGISTRY.forEach((mod) => {
    mod.actions.forEach((action) => {
      const actionName = action === "VIEW" ? "Xem" :
                         action === "CREATE" ? "Thêm" :
                         action === "EDIT" ? "Sửa" :
                         action === "DELETE" ? "Xóa" :
                         action === "IMPORT" ? "Import" :
                         action === "QC" ? "Kiểm định chất lượng" :
                         action === "LOCK" ? "Khóa an toàn" :
                         action === "EXPORT" ? "Xuất dữ liệu" : action;
      
      perms.push({
        name: `${mod.code}_${action}`,
        module_name: mod.code,
        action: action.toLowerCase(),
        description: `${actionName} ${mod.displayName}`,
      });
    });
  });

  return perms;
}

/**
 * Lấy displayName từ module code.
 */
export function getModuleDisplayName(code: string) {
  return MODULE_REGISTRY.find(m => m.code === code)?.displayName || code;
}
