"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { enrichGscHistoryRows } from "../lib/gsc-read-utils";
import { parseGscResultsJsonb } from "../lib/gsc-results-jsonb";
import { GSC_SESSIONS_FULL_DETAIL_SELECT } from "../lib/gsc-read-view-select";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import { parseGscBoSungNbFromUnknown } from "../lib/gsc-bo-sung-nguoi-benh";
import { parseGscBangKiemSnapshot } from "../lib/gsc-bang-kiem-snapshot";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

/**
 * Một phiên GSC + kết quả tiêu chí đọc thẳng từ DB (đủ cột FK).
 * Dùng trước in/xem bundle để không phụ thuộc bản sao đã map trên client.
 */
export async function getGiamSatChungSessionForViewBundle(sessionId: string) {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    const id = String(sessionId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiên." };

    const supabase = createAdminSupabaseClient();

    // 1. Fetch Session Metadata from View (Smart DB pattern)
    const { data: ses, error: sErr } = await supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
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

    // Ảnh chụp bổ sung NB nằm trong metadata fact (chưa lộ hết trên view).
    const { data: metaRow } = await supabase
      .from("gstt_fact_chung_sessions")
      .select("metadata")
      .eq("id", id)
      .maybeSingle();
    const meta = (metaRow?.metadata || {}) as Record<string, unknown>;
    const boSungSnap = parseGscBoSungNbFromUnknown(meta);
    const bangKiemSnapshot = parseGscBangKiemSnapshot(meta);

    // 2. Map Results from JSONB column
    const rs = parseGscResultsJsonb(ses.results_jsonb);

    // 3. Enrich and Map back to expected format
    const enriched = enrichGscHistoryRows([ses as Record<string, unknown>])[0];
    const row = {
      ...enriched,
      ...boSungSnap,
      results: rs,
      bang_kiem_snapshot: bangKiemSnapshot,
    };
    
    return { success: true as const, data: row };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
