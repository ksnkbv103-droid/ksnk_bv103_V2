"use server";

/**
 * Bật/ngưng hồ sơ nhân sự từ bảng (bật/tắt, xóa mềm) — lát ACC-2.
 * Thay đường client ghi thẳng `mdm_nhan_su.is_active`: ngưng phải ban Auth + xóa cache quyền.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { invalidateUserPermissionsCache, verifyPermission } from "@/lib/server-permission";
import { logAdminAction } from "@/lib/admin-audit";
import { QUAN_TRI_HUB_PATH } from "@/lib/master-data/quan-tri-paths";
import { authUserHasAdminRole } from "./nhan-su-login-email.guard";
import { syncStaffAuthBan } from "../lib/nhan-su-auth-ban";

const setNhanSuActiveSchema = z.object({
  ids: z.array(z.string().uuid("Mã nhân sự không hợp lệ.")).min(1, "Chưa chọn nhân sự.").max(200, "Tối đa 200 hồ sơ mỗi lần."),
  active: z.boolean(),
  /** `delete` = xóa mềm (cần quyền delete); `toggle` = bật/tắt (cần quyền edit). */
  mode: z.enum(["toggle", "delete"]),
});

export async function setNhanSuActiveAction(input: { ids: string[]; active: boolean; mode: "toggle" | "delete" }) {
  try {
    const parsed = setNhanSuActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." };
    }
    const { ids, active, mode } = parsed.data;
    await verifyPermission("NHAN_SU", mode === "delete" ? "delete" : "edit");
    const supabase = createAdminSupabaseClient();

    const { data: rows, error: readErr } = await supabase
      .from("mdm_nhan_su")
      .select("id, auth_user_id, is_active")
      .in("id", ids);
    if (readErr) throw readErr;
    const targets = (rows || []) as Array<{ id: string; auth_user_id: string | null; is_active: boolean | null }>;
    if (targets.length === 0) return { success: false as const, error: "Không tìm thấy hồ sơ nhân sự." };

    const changedLinked = targets.filter((r) => r.auth_user_id && (r.is_active !== false) !== active);
    if (!active) {
      for (const r of changedLinked) {
        if (await authUserHasAdminRole(supabase, String(r.auth_user_id))) {
          return { success: false as const, error: "Không được ngưng hồ sơ đang gắn tài khoản quản trị (ADMIN)." };
        }
      }
    }

    const { error: upErr } = await supabase
      .from("mdm_nhan_su")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .in(
        "id",
        targets.map((r) => r.id),
      );
    if (upErr) throw upErr;

    const banErrors: string[] = [];
    for (const r of changedLinked) {
      const ban = await syncStaffAuthBan(supabase, String(r.auth_user_id), active);
      if (!ban.ok) banErrors.push(ban.error);
      await logAdminAction({
        action: "LOCK_UNLOCK_ACCOUNT",
        targetTable: "mdm_nhan_su",
        targetId: r.id,
        before: { is_active: r.is_active !== false },
        after: { is_active: active, auth_ban_synced: ban.ok },
      });
    }
    await invalidateUserPermissionsCache();
    revalidatePath(QUAN_TRI_HUB_PATH);

    if (banErrors.length > 0) return { success: false as const, error: banErrors[0] };
    return { success: true as const, count: targets.length };
  } catch (e: unknown) {
    console.error({ module: "NHAN_SU", action: "setNhanSuActiveAction", error: e });
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
