"use server";

import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";

/**
 * ADM-03: chỉ ADMIN (vai trò) hoặc email khẩn cấp (env) được ghi RBAC / tài khoản.
 * Không còn nhánh PHAN_QUYEN.edit.
 */
export async function ensureRbacAdmin() {
  const supabase = await createServerSupabaseUserClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user?.id) throw new Error("Bạn chưa đăng nhập");

  if (isTrustedAdminEmail(user.email)) {
    const { logAdminAction } = await import("@/lib/admin-audit");
    void logAdminAction({
      action: "BREAK_GLASS_USED",
      targetTable: "rbac",
      targetId: user.id,
      actorUserId: user.id,
      actorEmail: user.email,
      reason: "ensureRbacAdmin",
    });
    return user;
  }

  const admin = createAdminSupabaseClient();
  const { data: roleRows, error } = await admin
    .from("sys_user_roles")
    .select("sys_roles(name)")
    .eq("user_id", user.id);
  if (error) throw error;

  const isAdminRole = (roleRows || []).some((r: { sys_roles?: unknown }) => {
    const rel = r.sys_roles as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return String(name || "").trim().toUpperCase() === "ADMIN";
  });
  if (isAdminRole) return user;

  throw new Error("Chỉ quản trị hệ thống được thao tác phân quyền / tài khoản.");
}
