"use server";

import { createAdminSupabaseClient, createServerSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

/** Gốc URL ứng dụng do server quyết định — không nhận từ client (chống chuyển hướng link reset ra ngoài). */
function resolveSiteOrigin(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();
  if (vercelProd) return `https://${vercelProd.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

/** Gửi link/OTP đặt lại mật khẩu (Supabase Auth). redirectTo dựng ở server, phải trùng cấu hình project. */
export async function requestPasswordResetEmail(emailRaw: string) {
  const redirectTo = `${resolveSiteOrigin()}/login/reset-password`;
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
    if (error) {
      console.error("[requestPasswordReset]", error.message);
      return { ok: false as const, error: "Không gửi được email." };
    }
    return { ok: true as const };
  } catch (e: unknown) {
    console.error("[requestPasswordReset]", e instanceof Error ? e.message : e);
    return { ok: false as const, error: "Không gửi được email." };
  }
}

/**
 * Đổi mật khẩu khi đã đăng nhập (xác thực lại mật khẩu cũ). Clears must_change_password.
 * Email lấy từ phiên đăng nhập — không nhận từ client.
 */
export async function changePasswordWithReauth(oldPassword: string, newPassword: string) {
  if (!oldPassword || !newPassword) {
    return { ok: false as const, error: "Điền đủ thông tin." };
  }
  if (newPassword.length < 8) {
    return { ok: false as const, error: "Mật khẩu mới tối thiểu 8 ký tự." };
  }

  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: before } = await supabase.auth.getUser();
    const userId = before?.user?.id;
    const email = normalizeEmail(before?.user?.email || "");
    if (!userId || !email) {
      return { ok: false as const, error: "Phiên đăng nhập đã hết. Đăng nhập lại để đổi mật khẩu." };
    }

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
    const prevAppMeta =
      before?.user?.app_metadata && typeof before.user.app_metadata === "object"
        ? { ...(before.user.app_metadata as Record<string, unknown>) }
        : {};

    const { error: updErr } = await supabase.auth.updateUser({
      password: newPassword,
      data: { ...prevMeta, must_change_password: false },
    });
    if (updErr) {
      console.error("[changePasswordWithReauth]", updErr.message);
      return { ok: false as const, error: "Không đổi được mật khẩu. Kiểm tra mật khẩu mới rồi thử lại." };
    }

    try {
      const admin = createAdminSupabaseClient();
      const { error: clearErr } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...prevAppMeta, must_change_password: false },
        user_metadata: { ...prevMeta, must_change_password: false },
      });
      if (clearErr) {
        console.error("[changePasswordWithReauth] clear flag failed:", clearErr.message);
        return { ok: false as const, error: "Mật khẩu đã đổi nhưng chưa mở khóa tài khoản, vui lòng thử lại hoặc báo quản trị." };
      }
    } catch (clearErr) {
      console.error("[changePasswordWithReauth] clear flag failed:", clearErr);
      return { ok: false as const, error: "Mật khẩu đã đổi nhưng chưa mở khóa tài khoản, vui lòng thử lại hoặc báo quản trị." };
    }

    // Best-effort audit on linked staff row
    {
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

const RECOVERY_AMR_MAX_AGE_SEC = 15 * 60;

/**
 * Đặt mật khẩu mới từ phiên khôi phục (link email). Phiên lấy từ cookie, không nhận userId từ client.
 * Xóa cờ must_change_password ở cả app_metadata (proxy đọc) và user_metadata — client không tự sửa được app_metadata.
 */
export async function completePasswordRecovery(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false as const, error: "Mật khẩu tối thiểu 8 ký tự." };
  }
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: before } = await supabase.auth.getUser();
    const userId = before?.user?.id;
    if (!userId) {
      return { ok: false as const, error: "Liên kết đặt lại đã hết hạn. Yêu cầu gửi lại email." };
    }
    // QT-004: chỉ phiên khôi phục (amr recovery/otp từ JWT đã verify) hoặc đang bị ép đổi mật khẩu mới được đặt
    // mật khẩu không cần mật khẩu cũ; phiên đăng nhập thường phải dùng đổi mật khẩu có nhập mật khẩu cũ.
    const { data: claimsData } = await supabase.auth.getClaims();
    const amr = (claimsData?.claims as { amr?: unknown } | undefined)?.amr;
    const isRecoverySession =
      Array.isArray(amr) &&
      amr.some((m) => {
        if (!m || typeof m !== "object") return false;
        const { method, timestamp } = m as { method?: unknown; timestamp?: unknown };
        if (method !== "recovery" && method !== "otp") return false;
        // Chỉ nhận trong 15 phút từ lúc bấm link: phiên khôi phục dùng tiếp hằng ngày không còn đặt được mật khẩu thiếu mật khẩu cũ.
        return typeof timestamp === "number" && Date.now() / 1000 - timestamp <= RECOVERY_AMR_MAX_AGE_SEC;
      });
    const mustChange =
      (before.user?.app_metadata as { must_change_password?: unknown } | undefined)?.must_change_password === true;
    if (!isRecoverySession && !mustChange) {
      return {
        ok: false as const,
        error: "Phiên hiện tại không phải phiên khôi phục mật khẩu. Vào Tài khoản > Đổi mật khẩu và nhập mật khẩu cũ.",
      };
    }
    const prevMeta =
      before.user?.user_metadata && typeof before.user.user_metadata === "object"
        ? { ...(before.user.user_metadata as Record<string, unknown>) }
        : {};
    const prevAppMeta =
      before.user?.app_metadata && typeof before.user.app_metadata === "object"
        ? { ...(before.user.app_metadata as Record<string, unknown>) }
        : {};
    const { error: updErr } = await supabase.auth.updateUser({
      password: newPassword,
      data: { ...prevMeta, must_change_password: false },
    });
    if (updErr) {
      console.error("[completePasswordRecovery]", updErr.message);
      return { ok: false as const, error: "Không đặt được mật khẩu. Kiểm tra mật khẩu mới rồi thử lại." };
    }
    try {
      const admin = createAdminSupabaseClient();
      const { error: clearErr } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...prevAppMeta, must_change_password: false },
      });
      if (clearErr) {
        console.error("[completePasswordRecovery] clear flag failed:", clearErr.message);
        return { ok: false as const, error: "Mật khẩu đã đổi nhưng chưa mở khóa tài khoản, vui lòng thử lại hoặc báo quản trị." };
      }
    } catch (clearErr) {
      console.error("[completePasswordRecovery] clear flag failed:", clearErr);
      return { ok: false as const, error: "Mật khẩu đã đổi nhưng chưa mở khóa tài khoản, vui lòng thử lại hoặc báo quản trị." };
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Không đặt được mật khẩu." };
  }
}
