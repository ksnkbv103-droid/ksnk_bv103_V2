"use client";

import { useMemo } from "react";
import { createPermissionApi } from "./use-permission-api";
import { usePermissionContext } from "@/contexts/PermissionProvider";

export type { UserDataProfile } from "@/contexts/PermissionProvider";
export { invalidateClientRbacCache, PermissionProvider } from "@/contexts/PermissionProvider";

/**
 * Hook kiểm tra quyền hạn của người dùng (RBAC Linh hoạt).
 * Đọc snapshot từ PermissionProvider — một listener + một query DB cho toàn shell.
 */
export function usePermission(moduleKey?: string, action: string = "view") {
  const { loading, userRoles, permissions, userEmail, userData } = usePermissionContext();

  const api = useMemo(() => createPermissionApi(permissions, userRoles, userEmail), [permissions, userRoles, userEmail]);
  const allowed = moduleKey ? api.checkPermission(moduleKey, action) : false;

  return {
    loading,
    isAdmin: api.finalIsAdmin,
    userRoles,
    role: userRoles[0] || "",
    userEmail,
    userData,
    can: api.can,
    canView: api.canView,
    canCreate: api.canCreate,
    canEdit: api.canEdit,
    canDelete: api.canDelete,
    canApprove: api.canApprove,
    canImport: api.canImport,
    canExport: api.canExport,
    allowed,
    canManageNS: api.canManageNS,
    canImportNS: api.canImportNS,
    canManageBK: api.canManageBK,
    canImportBK: api.canImportBK,
    canManageDM: api.canManageDM,
    isNhanVienKSNK: api.isNhanVienKSNK,
    isMangLuoi: api.isMangLuoi,
    isToTruongMangLuoiKSNK: api.isToTruongMangLuoiKSNK,
    isThanhVienMangLuoiKSNK: api.isThanhVienMangLuoiKSNK,
    isHoiDongKSNK: api.isHoiDongKSNK,
    isGuestStatsOnly: api.isGuestStatsOnly,
    hasPermission: api.hasPermission,
  };
}
