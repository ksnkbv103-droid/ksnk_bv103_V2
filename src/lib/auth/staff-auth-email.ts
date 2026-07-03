import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

/** Email thực dùng cho Supabase Auth — ưu tiên auth.users khi hồ sơ đã liên kết auth_user_id. */
export async function resolveStaffLoginEmail(
  admin: SupabaseClient,
  staffEmail: string | null | undefined,
  authUserId: string | null | undefined,
): Promise<string> {
  const fallback = normalizeEmail(String(staffEmail || ""));
  const uid = String(authUserId || "").trim();
  if (!uid) return fallback;

  const { data, error } = await admin.auth.admin.getUserById(uid);
  if (error || !data?.user?.email) return fallback;
  return normalizeEmail(data.user.email);
}

/** Đồng bộ email đăng nhập Auth khi đổi email trên hồ sơ nhân sự. */
export async function syncStaffAuthEmail(
  admin: SupabaseClient,
  authUserId: string,
  newEmailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const newEmail = normalizeEmail(newEmailRaw);
  if (!newEmail) return { ok: false, error: "Email không hợp lệ." };

  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    email: newEmail,
    email_confirm: true,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Căn email Auth theo hồ sơ nếu lệch (sửa dữ liệu cũ / sau import). */
export async function ensureStaffAuthEmailMatchesProfile(
  admin: SupabaseClient,
  authUserId: string,
  profileEmail: string | null | undefined,
): Promise<{ ok: true; synced: boolean } | { ok: false; error: string }> {
  const target = normalizeEmail(String(profileEmail || ""));
  if (!target) return { ok: true, synced: false };

  const { data, error } = await admin.auth.admin.getUserById(authUserId);
  if (error || !data?.user) {
    return { ok: false, error: error?.message || "Không đọc được tài khoản đăng nhập." };
  }

  const current = normalizeEmail(String(data.user.email || ""));
  if (current === target) return { ok: true, synced: false };

  const sync = await syncStaffAuthEmail(admin, authUserId, target);
  if (!sync.ok) return sync;
  return { ok: true, synced: true };
}
