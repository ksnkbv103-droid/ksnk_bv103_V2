"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { unstable_cache } from "next/cache";

/**
 * Kiểm tra sau đăng nhập: có hồ sơ NHưng không hoạt động → cấm vào app.
 * Không có hồ sơ (tài khoản bootstrap/admin) → vẫn cho phép.
 *
 * Cache: chỉ lưu nhánh ok (active hoặc không có dòng). Lỗi / inactive ném sentinel
 * để `unstable_cache` không ghi; map ra ngoài.
 */
const SENTINEL_INACTIVE = "STAFF_SESSION_INACTIVE";
const SENTINEL_CHECK_FAILED = "STAFF_SESSION_CHECK_FAILED";

export type StaffSessionCheckResult =
  | { ok: true }
  | { ok: false; reason: "no_user" | "inactive" | "check_failed" };

export async function checkStaffSessionAllowed(): Promise<StaffSessionCheckResult> {
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user?.id) return { ok: false as const, reason: "no_user" };

    const getCachedOkOnly = unstable_cache(
      async (userId: string) => {
        const { data: row, error } = await supabase
          .from("v_sys_user_permissions")
          .select("staff_id, is_active")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Auth Session Check Error:", error);
          throw new Error(SENTINEL_CHECK_FAILED);
        }
        if (!row) return { ok: true as const };
        if (row.is_active === false) {
          throw new Error(SENTINEL_INACTIVE);
        }
        return { ok: true as const };
      },
      [`auth-check-${user.id}`],
      { revalidate: 60, tags: [`auth_check_${user.id}`] }
    );

    try {
      return await getCachedOkOnly(user.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === SENTINEL_INACTIVE) {
        return { ok: false as const, reason: "inactive" };
      }
      // Đã có user.id mà truy vấn lỗi / throw → fail-closed (không cache).
      console.error("[staff-session] check failed after user known:", e);
      return { ok: false as const, reason: "check_failed" };
    }
  } catch (error) {
    // Env/Supabase client lỗi TRƯỚC khi biết user — fail-open tránh gate 500 cả layout.
    console.error("[staff-session] checkStaffSessionAllowed config error:", error);
    return { ok: true as const };
  }
}
