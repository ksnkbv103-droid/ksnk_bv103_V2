import type { PermissionRow } from "@/hooks/use-permission-api";

export type UserDataProfile = {
  id: string | null;
  ma_nv: string | null;
  ho_ten: string | null;
  email: string | null;
  khoa_id: string | null;
  khoa: {
    ma_khoa: string | null;
    ten_khoa: string | null;
  } | null;
};

/** Snapshot RBAC đủ hydrate PermissionProvider — một nguồn/request. */
export type ServerRbacSnapshot = {
  authUserId: string;
  userRoles: string[];
  permissions: PermissionRow[];
  userEmail: string;
  userData: UserDataProfile | null;
};
