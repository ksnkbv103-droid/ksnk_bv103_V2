"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";

/** Ghi nhận sự vụ hỏng/mất ở mức chi tiết bằng audit note — dùng chung MDM + CSSD vận hành. */
export async function appendChiTietIssueNoteAction(params: {
  chiTietId: string;
  issueType: "HONG" | "MAT";
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const id = String(params.chiTietId || "").trim();
  if (!id) return { success: false as const, error: "Thiếu id dụng cụ chi tiết." };

  const { data: row, error } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .select("ghi_chu, bo_dung_cu_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false as const, error: error.message };
  const oldNote = String((row as { ghi_chu?: string | null } | null)?.ghi_chu || "").trim();
  const oldBoId = String((row as { bo_dung_cu_id?: string | null } | null)?.bo_dung_cu_id || "").trim();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const line = `[${params.issueType}] ${now}${params.note ? ` - ${String(params.note).trim()}` : ""}`;
  const detachLine = oldBoId
    ? `[AUTO] ${now} - Tách khỏi bộ hiện tại do báo ${params.issueType === "HONG" ? "hỏng" : "mất"}.`
    : "";
  const nextNote = oldNote
    ? `${oldNote}\n${line}${detachLine ? `\n${detachLine}` : ""}`
    : `${line}${detachLine ? `\n${detachLine}` : ""}`;

  const { error: ue } = await supabase
    .from("dm_bo_dung_cu_chi_tiet")
    .update({
      ghi_chu: nextNote,
      bo_dung_cu_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (ue) return { success: false as const, error: ue.message };

  revalidatePath("/quan-tri-he-thong/danh-muc/dung-cu/bo");
  revalidatePath("/quan-tri-he-thong/danh-muc/dung-cu/chi-tiet");
  revalidatePath("/quan-tri-he-thong/danh-muc/dung-cu");
  revalidatePath("/cssd-dung-cu");
  return { success: true as const };
}
