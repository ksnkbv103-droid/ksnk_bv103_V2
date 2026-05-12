import { ADMIN_EMAILS } from "@/lib/constants";

export type PermissionRow = { module: string; action: string };

export function createPermissionApi(permissions: PermissionRow[], userRoles: string[], userEmail: string) {
  const emailNorm = String(userEmail || "").toLowerCase().trim();
  const finalIsAdmin =
    userRoles.includes("ADMIN") || ADMIN_EMAILS.some((email) => email.toLowerCase().trim() === emailNorm);

  const checkPermission = (module: string, action: string) => {
    if (finalIsAdmin) return true;
    const act = action.toLowerCase();
    const mod = module.toUpperCase();
    return permissions.some(
      (p) => (p.module === mod || p.module === module) && (p.action === act || p.action === action),
    );
  };

  return {
    finalIsAdmin,
    checkPermission,
    can: checkPermission,
    canView: (module: string) => checkPermission(module, "view"),
    canCreate: (module: string) => checkPermission(module, "create"),
    canEdit: (module: string) => checkPermission(module, "edit"),
    canDelete: (module: string) => checkPermission(module, "delete"),
    canImport: (module: string) => checkPermission(module, "import"),
    canManageNS: () => checkPermission("NHAN_SU", "view"),
    canImportNS: () => checkPermission("NHAN_SU", "import"),
    canManageBK: () => checkPermission("BANG_KIEM", "view"),
    canImportBK: () => checkPermission("BANG_KIEM", "import"),
    canManageDM: () => checkPermission("DANH_MUC", "view"),
    isNhanVienKSNK: userRoles.includes("NHAN_VIEN_KSNK"),
    isMangLuoi:
      userRoles.includes("MANG_LUOI_KSNK") ||
      userRoles.includes("TO_TRUONG_MANG_LUOI_KSNK") ||
      userRoles.includes("THANH_VIEN_MANG_LUOI_KSNK"),
    isToTruongMangLuoiKSNK: userRoles.includes("TO_TRUONG_MANG_LUOI_KSNK"),
    isThanhVienMangLuoiKSNK: userRoles.includes("THANH_VIEN_MANG_LUOI_KSNK"),
    isHoiDongKSNK: userRoles.includes("HOI_DONG_KSNK"),
    hasPermission: (permName: string) => {
      if (finalIsAdmin) return true;
      return permissions.some((p) => `${p.module}_${p.action.toUpperCase()}` === permName.toUpperCase());
    },
  };
}
