import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { getRequestAuthUser } from "@/lib/auth/rbac-request";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { verifyCurrentActorPassword } from "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth";

/** Chỉ ADMIN (vai trò hoặc email khẩn cấp) được đổi email đăng nhập. */
export async function ensureAdminForLoginEmailChange(): Promise<User> {
  const user = await getRequestAuthUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");

  if (isTrustedAdminEmail(user.email)) return user;

  const admin = (await import("@/lib/supabase-server")).createAdminSupabaseClient();
  const { data: roleRows, error } = await admin
    .from("sys_user_roles")
    .select("sys_roles(name)")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const isAdminRole = (roleRows || []).some((r: { sys_roles?: unknown }) => {
    const rel = r.sys_roles as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return String(name || "").trim().toUpperCase() === "ADMIN";
  });
  if (isAdminRole) return user;

  throw new Error("Chỉ quản trị hệ thống được đổi email đăng nhập.");
}

export async function authUserHasAdminRole(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sys_user_roles")
    .select("sys_roles(name)")
    .eq("user_id", authUserId);
  if (error) throw new Error(error.message);
  return (data || []).some((r: { sys_roles?: unknown }) => {
    const rel = r.sys_roles as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return String(name || "").trim().toUpperCase() === "ADMIN";
  });
}

export type LoginEmailChangeGateInput = {
  supabase: SupabaseClient;
  authUserId: string;
  oldEmail: string;
  newEmailRaw: string;
  confirmActorPassword?: string;
};

/**
 * Cổng đổi email đăng nhập (ADM-01): ADMIN + mật khẩu; cấm đổi TK ADMIN khác;
 * cấm đổi sang email khẩn cấp.
 */
export async function assertLoginEmailChangeAllowed(
  input: LoginEmailChangeGateInput,
): Promise<{ actor: User; newEmail: string; oldEmail: string }> {
  const newEmail = normalizeEmail(input.newEmailRaw);
  const oldEmail = normalizeEmail(input.oldEmail);
  if (!newEmail) throw new Error("Email không hợp lệ.");
  if (newEmail === oldEmail) {
    const actor = await getRequestAuthUser();
    if (!actor?.id) throw new Error("Bạn chưa đăng nhập.");
    return { actor, newEmail, oldEmail };
  }

  if (isTrustedAdminEmail(newEmail)) {
    throw new Error("Không được đổi sang email quyền khẩn cấp.");
  }

  const actor = await ensureAdminForLoginEmailChange();

  const reauth = await verifyCurrentActorPassword(String(input.confirmActorPassword || ""));
  if (!reauth.ok) throw new Error(reauth.error);

  const targetIsAdmin = await authUserHasAdminRole(input.supabase, input.authUserId);
  if (targetIsAdmin && actor.id !== input.authUserId) {
    throw new Error("Không được đổi email đăng nhập của tài khoản quản trị khác.");
  }

  return { actor, newEmail, oldEmail };
}
