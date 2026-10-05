"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";

/**
 * Client refetch RBAC không được đọc env break-glass — hỏi server mỗi lần.
 * Env `KSNK_BREAK_GLASS_EMAILS` trống → luôn false.
 */
export async function isCurrentUserBreakGlassAdmin(): Promise<boolean> {
  try {
    const sb = await createServerSupabaseUserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    return isTrustedAdminEmail(user?.email);
  } catch {
    return false;
  }
}
