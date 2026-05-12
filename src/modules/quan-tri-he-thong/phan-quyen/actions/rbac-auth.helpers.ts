"use server";

import { ADMIN_EMAILS } from "@/lib/constants";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";

/**
 * Quyền cấu hình RBAC đồng bộ SSOT [`permission-registry`]:
 * Email tin cậy, vai trò ADMIN, hoặc quyền `PHAN_QUYEN` + edit (ghi ma trận / đồng bộ).
 */
export async function ensureRbacAdmin() {
  const supabase = await createServerSupabaseUserClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user?.id) throw new Error("Bạn chưa đăng nhập");

  const isAdminEmail = ADMIN_EMAILS.some(
    (email) => String(user.email || "").toLowerCase().trim() === email.toLowerCase().trim(),
  );
  if (isAdminEmail) return user;

  const admin = createAdminSupabaseClient();
  const { data: roleRows, error } = await admin
    .from("rel_user_roles")
    .select("dm_roles(name)")
    .eq("user_id", user.id);
  if (error) throw error;

  const isAdminRole = (roleRows || []).some((r: { dm_roles?: unknown }) => {
    const rel = r.dm_roles as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return String(name || "").trim().toUpperCase() === "ADMIN";
  });
  if (isAdminRole) return user;

  await verifyPermission("PHAN_QUYEN", "edit");
  return user;
}
