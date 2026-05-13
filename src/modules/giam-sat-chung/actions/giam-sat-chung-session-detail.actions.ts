"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { enrichGscHistoryRows } from "../lib/gsc-read-utils";
import { GSC_RESULTS_ROW_SELECT, GSC_SESSIONS_FULL_DETAIL_SELECT } from "../lib/gsc-read-view-select";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

/**
 * Một phiên GSC + kết quả tiêu chí đọc thẳng từ DB (đủ cột FK).
 * Dùng trước in/xem bundle để không phụ thuộc bản sao đã map trên client.
 */
export async function getGiamSatChungSessionForViewBundle(sessionId: string) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    const id = String(sessionId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiên." };

    // 1. Fetch Session Metadata from View (Smart DB pattern)
    const { data: ses, error: sErr } = await supabase
      .from("v_fact_giam_sat_chung_sessions_full")
      .select(GSC_SESSIONS_FULL_DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (sErr) throw sErr;
    if (!ses) return { success: false as const, error: "Không tìm thấy phiên." };

    if (scope.isMangLuoiKsnk) {
      const myKhoa = scope.actorKhoaId ? String(scope.actorKhoaId) : null;
      const sessionKhoa = ses.khoa_id ? String(ses.khoa_id) : null;
      if (!myKhoa || !sessionKhoa || sessionKhoa !== myKhoa) {
        // Không tiết lộ tồn tại phiên ngoài phạm vi khoa.
        return { success: false as const, error: "Không tìm thấy phiên." };
      }
    }

    // 2. Fetch Results
    const { data: rs, error: rErr } = await supabase
      .from("fact_giam_sat_chung_results")
      .select(GSC_RESULTS_ROW_SELECT)
      .eq("session_id", id);
    
    if (rErr) throw rErr;

    // 3. Enrich and Map back to expected format
    const enriched = enrichGscHistoryRows([ses as Record<string, unknown>])[0];
    const row = { ...enriched, results: rs || [] };
    
    return { success: true as const, data: row };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
