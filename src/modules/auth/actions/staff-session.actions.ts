"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";

/**
 * Kiểm tra sau đăng nhập: có hồ sơ NHưng không hoạt động → cấm vào app.
 * Không có hồ sơ (tài khoản bootstrap/admin) → vẫn cho phép.
 */
import { unstable_cache } from "next/cache";

export async function checkStaffSessionAllowed() {
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user?.id) return { ok: false as const, reason: "no_user" };

    const getCachedCheck = unstable_cache(
      async (userId: string) => {
        const { data: row, error } = await supabase
          .from("v_auth_user_permissions")
          .select("staff_id, is_active")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Auth Session Check Error:", error);
          return { ok: true as const };
        }
        if (!row) return { ok: true as const };
        if (row.is_active === false) return { ok: false as const, reason: "inactive" };
        return { ok: true as const };
      },
      [`auth-check-${user.id}`],
      { revalidate: 60, tags: [`auth_check_${user.id}`] }
    );

    try {
      return await getCachedCheck(user.id);
    } catch {
      return { ok: true as const };
    }
  } catch (error) {
    // Phòng env thiếu / Supabase down — không để gate ném 500 cho cả layout.
    console.error("[staff-session] checkStaffSessionAllowed config error:", error);
    return { ok: true as const };
  }
}
