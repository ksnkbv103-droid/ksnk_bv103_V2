/**
 * Account Linking Governance Actions
 * 
 * Quản lý luồng liên kết giữa Supabase Auth (Tài khoản đăng nhập) 
 * và MDM Nhân sự (Hồ sơ bệnh viện).
 */

"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";
import { ensureRbacAdmin } from "@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers";

type AccountLinkReadSnapshot =
  | { kind: "linked"; nhanSuId: string }
  | { kind: "no_match"; message: string }
  | { kind: "taken"; message: string }
  | { kind: "needs_link"; nhanSuId: string };

/**
 * Kiểm tra và tự động liên kết tài khoản nếu tìm thấy email khớp trong hồ sơ nhân sự.
 * Thường gọi sau khi đăng nhập hoặc khi truy cập dashboard.
 *
 * SEC-AUTH-01: `unstable_cache` may wrap pure reads only. The service-role
 * UPDATE of `mdm_nhan_su.auth_user_id` MUST run outside the cache callback
 * (side-effects inside cache are unsafe / hard to audit). Auto-link still
 * matches the logged-in user's email to one active unmatched staff row.
 * Manual link (`manualLinkAccountAction`) keeps its email / RBAC-admin checks.
 *
 * Test note: login as a user whose email equals one unlinked active
 * `mdm_nhan_su` row → first `syncAccountLinkAction` writes `auth_user_id`
 * outside cache and returns `{ autoLinked: true }`; a later call should
 * return cached `{ linked: true }` without performing UPDATE.
 */
export async function syncAccountLinkAction() {
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id || !user.email) return { success: false, error: "Không tìm thấy phiên đăng nhập." };

    const cacheTag = `account_sync_${user.id}`;

    // Pure reads only — no INSERT/UPDATE/DELETE inside unstable_cache (SEC-AUTH-01).
    const getCachedLinkRead = unstable_cache(
      async (userId: string, userEmail: string): Promise<AccountLinkReadSnapshot> => {
        const adminClient = createAdminSupabaseClient();

        const { data: existing } = await adminClient
          .from("mdm_nhan_su")
          .select("id")
          .eq("auth_user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (existing) return { kind: "linked", nhanSuId: existing.id };

        const emailNorm = normalizeEmail(userEmail);
        const { data: match, error: matchErr } = await adminClient
          .from("v_mdm_nhan_su_full")
          .select("id, auth_user_id")
          .eq("email", emailNorm)
          .eq("is_active", true)
          .maybeSingle();

        if (matchErr || !match) {
          return { kind: "no_match", message: "Không tìm thấy hồ sơ khớp email." };
        }

        if (match.auth_user_id && match.auth_user_id !== userId) {
          return { kind: "taken", message: "Hồ sơ này đã được liên kết với tài khoản khác." };
        }

        return { kind: "needs_link", nhanSuId: match.id };
      },
      [`account-sync-${user.id}`],
      { revalidate: 3600, tags: [cacheTag] }
    );

    try {
      const snapshot = await getCachedLinkRead(user.id, user.email);
      if (snapshot.kind === "linked") {
        return { success: true, linked: true, nhanSuId: snapshot.nhanSuId };
      }
      if (snapshot.kind === "no_match" || snapshot.kind === "taken") {
        return { success: true, linked: false, message: snapshot.message };
      }

      // Service-role write OUTSIDE cache. Same email-match predicate as the read.
      const adminClient = createAdminSupabaseClient();
      const { error: upErr } = await adminClient
        .from("mdm_nhan_su")
        .update({ auth_user_id: user.id })
        .eq("id", snapshot.nhanSuId);

      if (upErr) return { success: false, error: "Lỗi khi cập nhật liên kết: " + upErr.message };

      revalidateTag(cacheTag, "default");
      revalidatePath("/");
      return { success: true, linked: true, nhanSuId: snapshot.nhanSuId, autoLinked: true };
    } catch (error) {
      console.error("syncAccountLinkAction error:", error);
      return { success: false, error: "Lỗi hệ thống khi đồng bộ tài khoản." };
    }
  } catch (error) {
    // Phòng env thiếu / Supabase down — không để gate gây 500 cho cả layout.
    console.error("[account-link] syncAccountLinkAction config error:", error);
    return { success: false, error: "Lỗi hệ thống khi đồng bộ tài khoản." };
  }
}

/**
 * Liên kết thủ công tài khoản hiện tại với một mã nhân viên cụ thể.
 * Chỉ khi hồ sơ chưa có auth_user_id.
 * Bảo vệ: người dùng thường chỉ liên kết được nếu email đăng nhập khớp email trên hồ sơ;
 * quản trị RBAC có thể liên kết thay (đồng bộ với màn Tài khoản KSNK).
 */
export async function manualLinkAccountAction(maNv: string) {
  const supabase = await createServerSupabaseUserClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) return { success: false, error: "Yêu cầu đăng nhập." };

  let mayLinkAsAdmin = false;
  try {
    await ensureRbacAdmin();
    mayLinkAsAdmin = true;
  } catch {
    mayLinkAsAdmin = false;
  }

  const adminClient = createAdminSupabaseClient();

  const { data: target, error: tErr } = await adminClient
    .from("v_mdm_nhan_su_full")
    .select("id, auth_user_id, email")
    .eq("ma_nv", maNv.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  if (tErr || !target) return { success: false, error: "Không tìm thấy mã nhân viên hoặc hồ sơ không hoạt động." };
  if (target.auth_user_id) return { success: false, error: "Nhân viên này đã được liên kết với một tài khoản khác." };

  if (!mayLinkAsAdmin) {
    const loginNorm = user.email ? normalizeEmail(user.email) : "";
    const staffNorm = target.email ? normalizeEmail(String(target.email)) : "";
    if (!loginNorm || !staffNorm || loginNorm !== staffNorm) {
      return {
        success: false,
        error:
          "Email đăng nhập phải trùng email trên hồ sơ nhân viên để tự liên kết theo mã NV. Nếu cần gán khác, dùng khu vực Tài khoản KSNK (quản trị).",
      };
    }
  }

  const { error: upErr } = await adminClient
    .from("mdm_nhan_su")
    .update({ auth_user_id: user.id })
    .eq("id", target.id);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath("/");
  return { success: true };
}
