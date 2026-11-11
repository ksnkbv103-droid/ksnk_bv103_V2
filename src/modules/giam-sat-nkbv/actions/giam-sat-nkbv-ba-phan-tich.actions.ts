"use server";

/**
 * Nháp phiên phân tích BA — lưu máy chủ (đổi máy / F5 còn nháp).
 */

import { getNkbvKhoaRestriction, isNkbvBenhAnInScope, NKBV_OUT_OF_SCOPE_ERROR } from "../lib/nkbv-khoa-scope.server";
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
import { nkbvBaPhanTichReplaceSchema } from "@/lib/validations/giam-sat-nkbv.validations";

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
  if (!(await isNkbvBenhAnInScope(await getNkbvKhoaRestriction(), ma))) {
    return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR, sessions: [] as BaAnalysisSession[] };
  }

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
  const parsed = nkbvBaPhanTichReplaceSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  const ma = parsed.data.ma_benh_an;
  const mode = parseBaAnalysisMode(input.mode);

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  // NKBV-008: tắt bộ cũ + chèn bộ mới trong một transaction (RPC có khóa theo BA + chế độ).
  const rows = input.sessions.map((s) => ({
    ...sessionToDbRow(s, ma, mode),
    created_at: s.createdAt || now,
    updated_at: s.updatedAt || now,
  }));
  const { error } = await supabase.rpc("rpc_nkbv_replace_ba_phan_tich_sessions", {
    p_ma_benh_an: ma,
    p_analysis_mode: mode,
    p_rows: rows,
  });
  if (error) return { success: false as const, error: error.message };

  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
