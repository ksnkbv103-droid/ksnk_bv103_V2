"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { GSC_SESSIONS_FULL_LIST_SELECT } from "../lib/gsc-read-view-select";
import { mapGscSessionToExportRow, type GscExportRow } from "../lib/gsc-export-map";

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

    const rows = ((data ?? []) as Record<string, unknown>[]).map(mapGscSessionToExportRow);
    return { success: true, rows };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Không xuất được GSC" };
  }
}
