"use server";

import {
  createAdminSupabaseClient,
  createServerSupabaseUserClient,
} from "@/lib/supabase-server";
import {
  identifierLooksLikeEmail,
  normalizeEmail,
  normalizeLoginIdentifier,
} from "@/lib/auth/normalize-login-identifier";
import { resolveStaffLoginEmail } from "@/lib/auth/staff-auth-email";

/**
 * Đăng nhập: nhập được mã nhân viên (ma_nv) hoặc email.
 * Backend tra email thật của Supabase Auth (service role — chỉ trong server action).
 */
export async function loginWithStaffIdentifier(identifier: string, password: string) {
  const id = normalizeLoginIdentifier(identifier);
  const pw = password;
  if (!id || !pw) {
    return { ok: false as const, error: "Vui lòng nhập mã/email và mật khẩu." };
  }

  try {
    const admin = createAdminSupabaseClient();
    let emailForAuth = "";

    if (identifierLooksLikeEmail(id)) {
      emailForAuth = normalizeEmail(id);
      const { data: staffByEmail } = await admin
        .from("v_mdm_nhan_su_full")
        .select("email, is_active, auth_user_id")
        .eq("email", emailForAuth)
        .maybeSingle();

      if (staffByEmail && staffByEmail.is_active === false) {
        return { ok: false as const, error: "Hồ sơ nhân sự không còn hoạt động. Liên hệ quản trị." };
      }
      emailForAuth = await resolveStaffLoginEmail(
        admin,
        staffByEmail?.email || emailForAuth,
        staffByEmail?.auth_user_id,
      );
    } else {
      const { data: row, error: lookupErr } = await admin
        .from("v_mdm_nhan_su_full")
        .select("email, is_active, auth_user_id")
        .eq("ma_nv", id)
        .maybeSingle();

      if (lookupErr) {
        return { ok: false as const, error: "Đăng nhập không thành công." };
      }
      if (!row?.email) {
        return { ok: false as const, error: "Chưa cấu hình email cho mã nhân viên này. Liên hệ quản trị." };
      }
      if (row.is_active === false) {
        return { ok: false as const, error: "Hồ sơ nhân sự không còn hoạt động. Liên hệ quản trị." };
      }
      emailForAuth = await resolveStaffLoginEmail(admin, row.email, row.auth_user_id);
    }

    const supabase = await createServerSupabaseUserClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: emailForAuth,
      password: pw,
    });

    if (signErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[loginWithStaffIdentifier] signIn failed:", signErr.message);
      }
      // Bổ sung thông tin chẩn đoán lỗi cực kỳ quan trọng cho quá trình chuyển đổi Supabase mới
      if (signErr.message?.includes("Email not confirmed")) {
        return {
          ok: false as const,
          error: "Tài khoản chưa được xác nhận email. Vui lòng liên hệ Quản trị viên để TẮT cài đặt 'Confirm email' trong tab Authentication -> Providers -> Email trên Supabase Dashboard.",
        };
      }
      return { ok: false as const, error: "Mã đăng nhập hoặc mật khẩu không đúng." };
    }

    /** Email đã dùng cho Auth — client gọi `signInWithPassword` lần nữa để ghi cookie cho Server Actions. */
    return { ok: true as const, authEmail: emailForAuth };
  } catch (err) {
    console.error("[loginWithStaffIdentifier] Unexpected error:", err);
    return { ok: false as const, error: "Đăng nhập không thành công. Thử lại sau hoặc liên hệ Admin." };
  }
}
