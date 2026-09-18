"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

/** Re-auth mật khẩu admin hiện tại (session user) trước thao tác nhạy cảm. */
export async function verifyCurrentActorPassword(
  passwordRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const password = String(passwordRaw || "");
  if (!password) {
    return { ok: false, error: "Nhập mật khẩu của bạn để xác nhận." };
  }
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: auth } = await supabase.auth.getUser();
    const email = normalizeEmail(auth?.user?.email || "");
    if (!email) {
      return { ok: false, error: "Không xác định được phiên đăng nhập." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, error: "Mật khẩu xác nhận không đúng." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Không xác thực được mật khẩu quản trị." };
  }
}
