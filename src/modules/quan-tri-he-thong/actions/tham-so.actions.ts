"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { logAdminAction } from "@/lib/admin-audit";
import { kiemThamSoNhap, type ThamSoNhap } from "@/lib/analytics/tham-so-nhap";
import { ensureRbacAdmin } from "../phan-quyen/actions/rbac-auth.helpers";

/** Thêm một giá trị tham số theo ngày hiệu lực (chỉ ADMIN). Bảng chỉ thêm dòng, không sửa/xóa. */
export async function themThamSo(input: ThamSoNhap): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await ensureRbacAdmin();
    const kiem = kiemThamSoNhap(input, todayYmdInVn());
    if (!kiem.ok) return { success: false, error: kiem.error };

    const db = createAdminSupabaseClient();
    const { error } = await db.from("ksnk_dm_tham_so").insert({ ...kiem.row, created_by: user.id });
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "Mã này đã có giá trị cho ngày hiệu lực đó; chọn ngày khác." };
      }
      throw error;
    }
    await logAdminAction({
      action: "THAM_SO_THEM",
      targetTable: "ksnk_dm_tham_so",
      targetId: `${kiem.row.ma_tham_so}@${kiem.row.hieu_luc_tu}`,
      before: null,
      after: { ...kiem.row },
      reason: kiem.row.nguon,
      actorUserId: user.id,
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error({ module: "QUAN_TRI", action: "themThamSo", error });
    return { success: false, error: error instanceof Error ? error.message : "Không lưu được tham số." };
  }
}
