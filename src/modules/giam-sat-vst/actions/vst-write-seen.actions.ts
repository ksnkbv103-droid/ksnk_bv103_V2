"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { resolveVstScopedSessionIds } from "../lib/vst-session-scope";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

/** Đánh dấu phiên VST đã được mở từ lịch sử (in / xem). */
export async function markVSTSessionsSeen(sessionIds: string[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_VST", "view");
    const scope = await getActorKsnkScope();
    const ids = (sessionIds || []).map(String).filter(Boolean);
    if (!ids.length) return { success: true as const };
    const { data: rows, error: rowsErr } = await supabase
      .from("fact_giam_sat_vst_sessions")
      .select("id,khoa_id")
      .in("id", ids);
    if (rowsErr) throw rowsErr;
    const resolved = resolveVstScopedSessionIds(
      ids,
      ((rows || []) as Array<{ id?: string; khoa_id?: string | null }>).map((x) => ({
        id: String(x.id || ""),
        khoa_id: x.khoa_id ? String(x.khoa_id) : null,
      })),
      { isMangLuoiKsnk: scope.isMangLuoiKsnk, actorKhoaId: scope.actorKhoaId ?? null },
    );
    if (!resolved.ok) {
      return { success: false as const, error: resolved.error };
    }
    const { error } = await supabase
      .from("fact_giam_sat_vst_sessions")
      .update({ is_seen: true, updated_at: new Date().toISOString() })
      .in("id", resolved.targetIds);
    if (error) throw error;
    revalidatePath("/giam-sat-vst/lich-su");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
