"use server";

import { ADMIN_EMAILS } from "@/lib/constants";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { unstable_cache } from "next/cache";
import { cache } from "react";

type PermissionCheck = { moduleKey: string; action: string };

function isTrustedAdminEmail(email: string | undefined): boolean {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === e);
}

/** Fetch and cache permissions for 5 minutes per user. */
const fetchUserPermissions = unstable_cache(
  async (userId: string) => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("v_auth_user_permissions")
      .select("roles, permissions")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      roles: (data?.roles as string[]) || [],
      permissions: (data?.permissions as { module: string; action: string }[]) || []
    };
  },
  ["user-permissions-store"],
  { revalidate: 300 }
);

/** Request-scope deduplication for permissions. */
const getPermissionsRequestScope = cache(async (userId: string) => {
  return fetchUserPermissions(userId);
});

/** Một round-trip DB: đọc view quyền một lần, kiểm tra nhiều cặp (module + action). */
export async function verifyPermissions(required: readonly PermissionCheck[]) {
  if (!required.length) return;

  const userSb = await createServerSupabaseUserClient();
  const { data: { user } } = await userSb.auth.getUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  // Trusted Super Admin bypass
  if (isTrustedAdminEmail(user.email)) return;

  const { roles, permissions } = await getPermissionsRequestScope(user.id);
  
  if (roles.includes("ADMIN")) return;

  const has = (moduleKey: string, action: string) =>
    permissions.some((p) => p.module === moduleKey && p.action === action);

  for (const r of required) {
    if (!has(r.moduleKey, r.action)) {
      throw new Error(`Bạn không có quyền [${r.action}] trên module [${r.moduleKey}].`);
    }
  }
}

export async function verifyPermission(moduleKey: string, action: string) {
  await verifyPermissions([{ moduleKey, action }]);
}

/**
 * Vai trò `ADMIN` trên RBAC + email trusted (AGENTS): được sửa/xóa mọi phiên giám sát,
 * bỏ qua ràng buộc chủ phiên và cửa sổ 30 phút ở tầng server action.
 */
export async function hasRBACAdminSupervisionBypass(): Promise<boolean> {
  const userSb = await createServerSupabaseUserClient();
  const {
    data: { user },
  } = await userSb.auth.getUser();
  if (!user?.id) return false;
  if (isTrustedAdminEmail(user.email)) return true;
  const { roles } = await getPermissionsRequestScope(user.id);
  return roles.includes("ADMIN");
}

/** Ít nhất một cặp (module, action) phải khớp — OR. Dùng cho đọc danh mục dùng chung nhiều module. */
export async function verifyAnyPermission(alternatives: readonly PermissionCheck[]) {
  if (!alternatives.length) return;

  const userSb = await createServerSupabaseUserClient();
  const {
    data: { user },
  } = await userSb.auth.getUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  if (isTrustedAdminEmail(user.email)) return;

  const { roles, permissions } = await getPermissionsRequestScope(user.id);

  if (roles.includes("ADMIN")) return;

  const has = (moduleKey: string, action: string) =>
    permissions.some((p) => p.module === moduleKey && p.action === action);

  const ok = alternatives.some((a) => has(a.moduleKey, a.action));
  if (!ok) {
    const keys = alternatives.map((a) => `${a.moduleKey}:${a.action}`).join(", ");
    throw new Error(`Cần ít nhất một quyền phù hợp (${keys}).`);
  }
}

