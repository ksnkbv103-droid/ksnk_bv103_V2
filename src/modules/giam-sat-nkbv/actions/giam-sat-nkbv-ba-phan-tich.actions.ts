"use server";

/**
 * Nháp phiên phân tích BA — lưu máy chủ (đổi máy / F5 còn nháp).
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import {
  type BaAnalysisSession,
  sessionsFromDbRows,
  sessionToDbRow,
} from "../lib/nkbv-ba-analysis-session";
import type { BaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";
import { parseBaAnalysisMode } from "../lib/nkbv-ba-analysis-mode";

async function assertCanWriteDraft() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "create");
  } catch {
    await verifyPermission("GIAM_SAT_NKBV", "edit");
  }
}

export async function loadNkbvBaPhanTichSessions(input: {
  ma_benh_an: string;
  mode?: BaAnalysisMode;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(input.ma_benh_an || "").trim();
  const mode = parseBaAnalysisMode(input.mode);
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án", sessions: [] as BaAnalysisSession[] };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_fact_ba_phan_tich")
    .select("session_id, analysis_mode, panel, index_payload, index_label, draft, created_at, updated_at")
    .eq("ma_benh_an", ma)
    .eq("analysis_mode", mode)
    .eq("is_active", true);
  if (error) return { success: false as const, error: error.message, sessions: [] as BaAnalysisSession[] };

  return { success: true as const, sessions: sessionsFromDbRows(data || []) };
}

/** Ghi đè toàn bộ nháp active của BA + chế độ (một sự thật). */
export async function replaceNkbvBaPhanTichSessions(input: {
  ma_benh_an: string;
  mode?: BaAnalysisMode;
  sessions: BaAnalysisSession[];
}) {
  await assertCanWriteDraft();
  const ma = String(input.ma_benh_an || "").trim();
  const mode = parseBaAnalysisMode(input.mode);
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error: offErr } = await supabase
    .from("nkbv_fact_ba_phan_tich")
    .update({ is_active: false, updated_at: now })
    .eq("ma_benh_an", ma)
    .eq("analysis_mode", mode)
    .eq("is_active", true);
  if (offErr) return { success: false as const, error: offErr.message };

  if (input.sessions.length === 0) {
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const };
  }

  const rows = input.sessions.map((s) => ({
    ...sessionToDbRow(s, ma, mode),
    created_at: s.createdAt || now,
    updated_at: s.updatedAt || now,
    is_active: true,
  }));

  const { error: insErr } = await supabase.from("nkbv_fact_ba_phan_tich").insert(rows);
  if (insErr) return { success: false as const, error: insErr.message };

  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
