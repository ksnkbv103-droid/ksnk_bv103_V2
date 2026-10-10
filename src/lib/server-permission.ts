"use server";

import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { getRequestAuthUser } from "@/lib/auth/rbac-request";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

type PermissionCheck = { moduleKey: string; action: string };

/** Tag bust khi lưu ma trận / gán vai trò — tránh user giữ quyền cũ tối đa 5 phút. */
const USER_PERMISSIONS_CACHE_TAG = "user-permissions-store";

export async function invalidateUserPermissionsCache() {
  revalidateTag(USER_PERMISSIONS_CACHE_TAG, "default");
}

/** Fetch and cache permissions for 5 minutes per user. */
const fetchUserPermissions = unstable_cache(
  async (userId: string) => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("v_sys_user_permissions")
      .select("roles, permissions")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      roles: (data?.roles as string[]) || [],
      permissions: (data?.permissions as { module: string; action: string }[]) || []
    };
  },
  [USER_PERMISSIONS_CACHE_TAG],
  { revalidate: 300, tags: [USER_PERMISSIONS_CACHE_TAG] },
);

/** Request-scope deduplication for permissions. */
const getPermissionsRequestScope = cache(async (userId: string) => {
  return fetchUserPermissions(userId);
});

/** Break-glass (env KSNK_BREAK_GLASS_EMAILS) — ghi nhật ký mỗi lần dùng, mọi cổng kiểm quyền. */
async function logBreakGlass(
  user: { id: string; email?: string | null },
  reason: string,
  checks?: readonly PermissionCheck[],
) {
  const { logAdminAction } = await import("@/lib/admin-audit");
  void logAdminAction({
    action: "BREAK_GLASS_USED",
    targetTable: "rbac",
    targetId: user.id,
    after: checks ? { checks: checks.map((r) => `${r.moduleKey}:${r.action}`) } : null,
    actorUserId: user.id,
    actorEmail: user.email,
    reason,
  });
}

/** Một round-trip DB: đọc view quyền một lần, kiểm tra nhiều cặp (module + action). */
export async function verifyPermissions(required: readonly PermissionCheck[]) {
  if (!required.length) return;

  // getUser() xác minh JWT server-side (ngăn JWT spoofing) — dedup qua React cache().
  const user = await getRequestAuthUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  if (isTrustedAdminEmail(user.email)) {
    await logBreakGlass(user, "verifyPermissions", required);
    return;
  }

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
  const user = await getRequestAuthUser();
  if (!user?.id) return false;
  if (isTrustedAdminEmail(user.email)) {
    await logBreakGlass(user, "supervision_bypass");
    return true;
  }
  const { roles } = await getPermissionsRequestScope(user.id);
  return roles.includes("ADMIN");
}

/** Tên vai trò RBAC của actor hiện tại (trusted email → ADMIN). */
export async function getActorRoleNames(): Promise<string[]> {
  const user = await getRequestAuthUser();
  if (!user?.id) return [];
  if (isTrustedAdminEmail(user.email)) return ["ADMIN"];
  const { roles } = await getPermissionsRequestScope(user.id);
  return roles.map((r) => String(r || "").trim()).filter(Boolean);
}

/** Ít nhất một cặp (module, action) phải khớp — OR. Dùng cho đọc danh mục dùng chung nhiều module. */
export async function verifyAnyPermission(alternatives: readonly PermissionCheck[]) {
  if (!alternatives.length) return;

  const user = await getRequestAuthUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  if (isTrustedAdminEmail(user.email)) {
    await logBreakGlass(user, "verifyAnyPermission", alternatives);
    return;
  }

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

/**
 * AND của các nhóm OR — một getUser + một đọc RBAC (tránh gọi verifyAnyPermission tuần tự).
 * Mỗi nhóm: cần ≥1 quyền khớp; mọi nhóm phải đạt.
 */
export async function verifyAllAnyPermissionGroups(
  groups: readonly (readonly PermissionCheck[])[],
) {
  if (!groups.length) return;

  const user = await getRequestAuthUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  if (isTrustedAdminEmail(user.email)) {
    await logBreakGlass(user, "verifyAllAnyPermissionGroups", groups.flat());
    return;
  }

  const { roles, permissions } = await getPermissionsRequestScope(user.id);
  if (roles.includes("ADMIN")) return;

  const has = (moduleKey: string, action: string) =>
    permissions.some((p) => p.module === moduleKey && p.action === action);

  for (const alternatives of groups) {
    if (!alternatives.length) continue;
    const ok = alternatives.some((a) => has(a.moduleKey, a.action));
    if (!ok) {
      const keys = alternatives.map((a) => `${a.moduleKey}:${a.action}`).join(", ");
      throw new Error(`Cần ít nhất một quyền phù hợp (${keys}).`);
    }
  }
}

