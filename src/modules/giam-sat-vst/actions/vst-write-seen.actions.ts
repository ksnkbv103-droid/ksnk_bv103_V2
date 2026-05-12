"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

/** Đánh dấu phiên VST đã được mở từ lịch sử (in / xem). */
export async function markVSTSessionsSeen(sessionIds: string[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const ids = (sessionIds || []).map(String).filter(Boolean);
    if (!ids.length) return { success: true as const };
    const { error } = await supabase
      .from("fact_giam_sat_vst_sessions")
      .update({ is_seen: true, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
    revalidatePath("/giam-sat-vst/lich-su");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
