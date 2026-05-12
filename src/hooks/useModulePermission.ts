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
    isToTruongMangLuoiKSNK,
    isThanhVienMangLuoiKSNK,
    isHoiDongKSNK,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canImport,
  } = usePermission(moduleKey, "view");

  return {
    loading,
    userEmail,
    userData,
    userRoles,
    isAdmin,
    isNhanVienKSNK,
    isMangLuoi,
    isToTruongMangLuoiKSNK,
    isThanhVienMangLuoiKSNK,
    isHoiDongKSNK,
    allowed: {
      view: canView(moduleKey),
      create: canCreate(moduleKey),
      edit: canEdit(moduleKey),
      delete: canDelete(moduleKey),
      import: canImport(moduleKey),
      manage: canEdit(moduleKey) || canDelete(moduleKey),
    },
  };
}
