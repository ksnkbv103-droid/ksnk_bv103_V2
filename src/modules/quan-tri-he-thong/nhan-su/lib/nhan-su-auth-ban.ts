/**
 * Đồng bộ khóa đăng nhập Supabase Auth theo trạng thái hồ sơ nhân sự (lát ACC-2).
 * Helper server (không phải Server Action) — caller đã kiểm quyền.
 *
 * Ngưng hồ sơ → ban user Auth (phiên/refresh token mới bị từ chối); bật lại → bỏ ban.
 * Tầng DB (SEC-1) đã lọc quyền theo `is_active`; ban là lớp chặn đăng nhập.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** ~100 năm — Supabase nhận chuỗi thời lượng Go; "none" để bỏ ban. */
export const STAFF_AUTH_BAN_DURATION = "876000h";

export async function syncStaffAuthBan(
  admin: SupabaseClient,
  authUserId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    ban_duration: active ? "none" : STAFF_AUTH_BAN_DURATION,
  });
  if (error) {
    return {
      ok: false,
      error: active
        ? `Đã bật hồ sơ nhưng chưa mở khóa được tài khoản đăng nhập: ${error.message}`
        : `Đã ngưng hồ sơ nhưng chưa khóa được tài khoản đăng nhập: ${error.message}`,
    };
  }
  return { ok: true };
}
