/**
 * Helper chỉ chạy phía server — KHÔNG phải Server Action (lát ACC-2: bỏ "use server" để không lộ thành endpoint gọi từ client).
 * Chỉ import từ file server (action/route/lib server); client import sẽ vỡ build vì supabase-server dùng next/headers.
 */

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
  // Đồng nhất SEC-1 (fn_sys_is_admin): cần hồ sơ nhân sự ACTIVE và vai trò ADMIN đang bật.
  const [{ data: roleRows, error }, { data: profile, error: profileErr }] = await Promise.all([
    admin.from("sys_user_roles").select("sys_roles(name, is_active)").eq("user_id", user.id),
    admin.from("mdm_nhan_su").select("id, is_active").eq("auth_user_id", user.id).maybeSingle(),
  ]);
  if (error) throw error;
  if (profileErr) throw profileErr;

  const isAdminRole = (roleRows || []).some((r: { sys_roles?: unknown }) => {
    const rel = r.sys_roles as
      | { name?: string; is_active?: boolean | null }
      | { name?: string; is_active?: boolean | null }[]
      | null
      | undefined;
    const role = Array.isArray(rel) ? rel[0] : rel;
    return String(role?.name || "").trim().toUpperCase() === "ADMIN" && role?.is_active !== false;
  });
  if (isAdminRole && profile?.id && profile.is_active !== false) return user;

  throw new Error("Chỉ quản trị hệ thống được thao tác phân quyền / tài khoản.");
}
