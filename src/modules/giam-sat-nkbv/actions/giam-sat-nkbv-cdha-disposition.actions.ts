"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getNkbvKhoaRestriction, isNkbvBenhAnInScope, NKBV_OUT_OF_SCOPE_ERROR } from "../lib/nkbv-khoa-scope.server";

const idSchema = z.string().trim().uuid();

/** Bỏ qua mốc CĐHA có lý do — hết chặn "cấy máu phân tích sau cùng". Ghi metadata.analysis_disposition. */
export async function skipNkbvCdhaAnalysis(input: { timeline_id: string; reason: string }) {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "create");
  } catch {
    await verifyPermission("GIAM_SAT_NKBV", "edit");
  }
  const id = String(input.timeline_id || "").trim();
  const reason = String(input.reason || "").trim();
  if (!idSchema.safeParse(id).success) return { success: false as const, error: "Mã CĐHA không hợp lệ" };
  if (!reason) return { success: false as const, error: "Nhập lý do bỏ qua" };

  const supabase = createAdminSupabaseClient();
  const { data: row, error: loadErr } = await supabase
    .from("nkbv_fact_ba_timeline")
    .select("id, metadata, ma_benh_an")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) return { success: false as const, error: loadErr.message };
  if (!row) return { success: false as const, error: "Không tìm thấy mốc CĐHA" };

  const restriction = await getNkbvKhoaRestriction();
  if (restriction.kind !== "all") {
    const ma = String(row.ma_benh_an ?? "").trim();
    if (!ma || !(await isNkbvBenhAnInScope(restriction, ma))) {
      return { success: false as const, error: NKBV_OUT_OF_SCOPE_ERROR };
    }
  }

  const prev = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
  const { error } = await supabase
    .from("nkbv_fact_ba_timeline")
    .update({
      metadata: {
        ...prev,
        analysis_disposition: "BO_QUA",
        analysis_skip_reason: reason,
        analysis_skipped_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}
