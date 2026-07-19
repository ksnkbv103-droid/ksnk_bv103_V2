"use client";

import { usePermission } from "@/hooks/usePermission";

/**
 * Hook rút gọn kiểm tra quyền theo module để giảm lặp code ở view/page.
 */
export function useModulePermission(moduleKey: string) {
  const {
    loading,
    userEmail,
    userData,
    userRoles,
    isAdmin,
    isNhanVienKSNK,
    isMangLuoi,
    isHoiDongKSNK,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canImport,
    hasPermission,
  } = usePermission(moduleKey, "view");

  const canApproveModule = (module: string) =>
    isAdmin ||
    canEdit(module) ||
    hasPermission(`${module}_APPROVE`) ||
    hasPermission(`${module}_approve`);

  return {
    loading,
    userEmail,
    userData,
    userRoles,
    isAdmin,
    isNhanVienKSNK,
    isMangLuoi,
    isHoiDongKSNK,
    allowed: {
      view: canView(moduleKey),
      create: canCreate(moduleKey),
      edit: canEdit(moduleKey),
      delete: canDelete(moduleKey),
      import: canImport(moduleKey),
      approve: canApproveModule(moduleKey),
      manage: canEdit(moduleKey) || canDelete(moduleKey),
    },
  };
}
