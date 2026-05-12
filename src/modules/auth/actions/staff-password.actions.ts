"use server";

import { createServerSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

/** Gửi link/OTP đặt lại mật khẩu (Supabase Auth). redirectTo phải trùng cấu hình project. */
export async function requestPasswordResetEmail(emailRaw: string, redirectTo: string) {
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false as const, error: "Nhập email." };

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Không gửi được email." };
  }
}

/** Đổi mật khẩu khi đã đăng nhập (xác thực lại mật khẩu cũ). */
export async function changePasswordWithReauth(emailRaw: string, oldPassword: string, newPassword: string) {
  const email = normalizeEmail(emailRaw);
  if (!email || !oldPassword || !newPassword) {
    return { ok: false as const, error: "Điền đủ thông tin." };
  }
  if (newPassword.length < 8) {
    return { ok: false as const, error: "Mật khẩu mới tối thiểu 8 ký tự." };
  }

  try {
    const supabase = await createServerSupabaseUserClient();
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (verifyErr) {
      return { ok: false as const, error: "Mật khẩu hiện tại không đúng." };
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updErr) return { ok: false as const, error: updErr.message };

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Không đổi được mật khẩu." };
  }
}
