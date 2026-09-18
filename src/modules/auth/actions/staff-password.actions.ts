"use server";

import { createAdminSupabaseClient, createServerSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

/** Gửi link/OTP đặt lại mật khẩu (Supabase Auth). redirectTo phải trùng cấu hình project. */
export async function requestPasswordResetEmail(emailRaw: string, redirectTo: string) {
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false as const, error: "Nhập email." };

  try {
    const admin = createAdminSupabaseClient();
    const { data: staff } = await admin
      .from("v_mdm_nhan_su_full")
      .select("id, is_active")
      .eq("email", email)
      .maybeSingle();
    if (staff && staff.is_active === false) {
      return { ok: true as const };
    }
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Không gửi được email." };
  }
}

/** Đổi mật khẩu khi đã đăng nhập (xác thực lại mật khẩu cũ). Clears must_change_password. */
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
    const { data: before } = await supabase.auth.getUser();
    const userId = before?.user?.id;

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (verifyErr) {
      return { ok: false as const, error: "Mật khẩu hiện tại không đúng." };
    }

    const prevMeta =
      before?.user?.user_metadata && typeof before.user.user_metadata === "object"
        ? { ...(before.user.user_metadata as Record<string, unknown>) }
        : {};

    const { error: updErr } = await supabase.auth.updateUser({
      password: newPassword,
      data: { ...prevMeta, must_change_password: false },
    });
    if (updErr) return { ok: false as const, error: updErr.message };

    // Best-effort audit on linked staff row
    if (userId) {
      try {
        const admin = createAdminSupabaseClient();
        const { data: staff } = await admin
          .from("mdm_nhan_su")
          .select("id, extra_data")
          .eq("auth_user_id", userId)
          .maybeSingle();
        if (staff?.id) {
          const extra =
            staff.extra_data && typeof staff.extra_data === "object" && !Array.isArray(staff.extra_data)
              ? { ...(staff.extra_data as Record<string, unknown>) }
              : {};
          const prev = Array.isArray(extra.auth_audit) ? [...(extra.auth_audit as unknown[])] : [];
          prev.push({
            actor_id: userId,
            actor_email: email,
            action: "self_change",
            staff_id: staff.id,
            ts: new Date().toISOString(),
          });
          extra.auth_audit = prev.slice(-40);
          await admin.from("mdm_nhan_su").update({ extra_data: extra }).eq("id", staff.id);
        }
      } catch (auditErr) {
        console.error("[auth_audit] self_change failed:", auditErr);
      }
    }

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Không đổi được mật khẩu." };
  }
}
