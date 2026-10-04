import { cache } from "react";
import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import type { PermissionRow } from "@/hooks/use-permission-api";
import type { ServerRbacSnapshot, UserDataProfile } from "@/lib/auth/rbac-snapshot.types";

export type { ServerRbacSnapshot, UserDataProfile };

const V_AUTH_USER_PERMISSIONS_SELECT =
  "staff_id,auth_user_id,ho_ten,ma_nv,email,khoa_id,is_active,ten_khoa_phong,ma_khoa_phong,roles,permissions" as const;

/** Dedup getUser trong cùng RSC/Server Action request. */
export const getRequestAuthUser = cache(async () => {
  const userSb = await createServerSupabaseUserClient();
  const {
    data: { user },
  } = await userSb.auth.getUser();
  return user;
});

async function loadRbacSnapshotForUser(userId: string, email: string | undefined): Promise<ServerRbacSnapshot> {
  const admin = createAdminSupabaseClient();
  const { data: authData, error } = await admin
    .from("v_sys_user_permissions")
    .select(V_AUTH_USER_PERMISSIONS_SELECT)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const userData: UserDataProfile | null = authData
    ? {
        id: authData.staff_id,
        ma_nv: authData.ma_nv,
        ho_ten: authData.ho_ten,
        email: authData.email,
        khoa_id: authData.khoa_id,
        khoa: authData.ten_khoa_phong
          ? {
              ma_khoa: authData.ma_khoa_phong,
              ten_khoa: authData.ten_khoa_phong,
            }
          : null,
      }
    : null;

  const roles = ((authData?.roles as string[]) || []).slice();
  if (isTrustedAdminEmail(email) && !roles.includes("ADMIN")) {
    roles.push("ADMIN");
  }

  return {
    authUserId: userId,
    userRoles: roles,
    permissions: ((authData?.permissions as PermissionRow[]) || []).slice(),
    userEmail: email || "",
    userData,
  };
}

/**
 * A) Client tự getSession + query view. B) Server cache() một lần, truyền xuống — chọn B.
 * Không nới bảo mật: vẫn getUser() xác minh JWT trên server.
 */
export const getServerRbacSnapshot = cache(async (): Promise<ServerRbacSnapshot | null> => {
  try {
    const user = await getRequestAuthUser();
    if (!user?.id) return null;
    return await loadRbacSnapshotForUser(user.id, user.email);
  } catch {
    return null;
  }
});
