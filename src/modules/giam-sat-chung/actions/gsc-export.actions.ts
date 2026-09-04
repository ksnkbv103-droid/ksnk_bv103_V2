"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { GSC_SESSIONS_FULL_LIST_SELECT } from "../lib/gsc-read-view-select";
import { mapGscSessionToExportRow, type GscExportRow } from "../lib/gsc-export-map";
import { mergeGscHistoryRowsWithSessionMetadata } from "../lib/gsc-read-utils";

export type { GscExportRow };

/**
 * Xuất dữ liệu thô phiên GSC (tối đa 5000 dòng) theo kỳ + scope mạng lưới.
 * Gate bằng VIEW (không bắt buộc EXPORT trên role seed).
 */
export async function exportGscSessionsRaw(params: {
  tu_ngay: string;
  den_ngay: string;
}): Promise<{ success: true; rows: GscExportRow[] } | { success: false; error: string }> {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    const supabase = createAdminSupabaseClient();

    let q = supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
      .select(GSC_SESSIONS_FULL_LIST_SELECT)
      .eq("is_active", true)
      .gte("ngay_giam_sat", params.tu_ngay)
      .lte("ngay_giam_sat", params.den_ngay)
      .order("ngay_giam_sat", { ascending: false })
      .limit(5000);

    if (scope.isMangLuoiKsnk && !scope.isAdmin && !scope.isNhanVienKsnk) {
      if (!scope.actorKhoaId) return { success: true, rows: [] };
      q = q.eq("khoa_id", scope.actorKhoaId);
    }

    const { data, error } = await q;
    if (error) throw error;

    const listRows = (data ?? []) as Record<string, unknown>[];
    const ids = listRows.map((r) => String(r.id ?? "").trim()).filter(Boolean);
    const metaById = new Map<string, unknown>();
    // Snapshot persist lúc ghi — export NHAT_KY/% không lệch khi đổi mẫu live.
    const META_CHUNK = 200;
    for (let i = 0; i < ids.length; i += META_CHUNK) {
      const chunk = ids.slice(i, i + META_CHUNK);
      const { data: metaRows } = await supabase
        .from("gstt_fact_chung_sessions")
        .select("id,metadata")
        .in("id", chunk);
      for (const m of metaRows ?? []) {
        const mid = String((m as { id?: unknown }).id ?? "").trim();
        if (mid) metaById.set(mid, (m as { metadata?: unknown }).metadata);
      }
    }
    const withSnap = mergeGscHistoryRowsWithSessionMetadata(listRows, metaById);
    const rows = withSnap.map(mapGscSessionToExportRow);
    return { success: true, rows };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không xuất được GSC" };
  }
}
