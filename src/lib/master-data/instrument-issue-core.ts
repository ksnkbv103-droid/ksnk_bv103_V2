import type { SupabaseClient } from "@supabase/supabase-js";

export type InstrumentIssueType = "HONG" | "MAT";

export type ChiTietIssueSnapshot = {
  ghi_chu: string;
  bo_dung_cu_id: string;
  loai_dung_cu_id: string;
  so_luong: number;
};

/** Pure: ghép dòng ghi chú audit + tách khỏi bộ (unit test). */
export function buildChiTietIssueNoteText(params: {
  issueType: InstrumentIssueType;
  note?: string;
  oldNote: string;
  oldBoId: string;
  now?: string;
}): string {
  const now = params.now ?? new Date().toISOString().slice(0, 19).replace("T", " ");
  const line = `[${params.issueType}] ${now}${params.note ? ` - ${String(params.note).trim()}` : ""}`;
  const detachLine = params.oldBoId
    ? `[AUTO] ${now} - Tách khỏi bộ hiện tại do báo ${params.issueType === "HONG" ? "hỏng" : "mất"}.`
    : "";
  const oldNote = params.oldNote.trim();
  if (!oldNote) return detachLine ? `${line}\n${detachLine}` : line;
  return detachLine ? `${oldNote}\n${line}\n${detachLine}` : `${oldNote}\n${line}`;
}

/** Ghi chú audit + tách khỏi bộ trên `cssd_dm_bo_dung_cu_chi_tiet`. Caller phải verify quyền. */
export async function appendChiTietIssueNoteCore(
  supabase: SupabaseClient,
  params: { chiTietId: string; issueType: InstrumentIssueType; note?: string },
): Promise<{ success: true; snapshot: ChiTietIssueSnapshot } | { success: false; error: string }> {
  const id = String(params.chiTietId || "").trim();
  if (!id) return { success: false, error: "Thiếu id dụng cụ chi tiết." };

  const { data: row, error } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select("ghi_chu, bo_dung_cu_id, loai_dung_cu_id, so_luong")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false, error: error.message };

  const snapshot: ChiTietIssueSnapshot = {
    ghi_chu: String((row as { ghi_chu?: string | null } | null)?.ghi_chu || "").trim(),
    bo_dung_cu_id: String((row as { bo_dung_cu_id?: string | null } | null)?.bo_dung_cu_id || "").trim(),
    loai_dung_cu_id: String((row as { loai_dung_cu_id?: string | null } | null)?.loai_dung_cu_id || "").trim(),
    so_luong: Math.max(1, Number((row as { so_luong?: number | null } | null)?.so_luong || 1) || 1),
  };

  const nextNote = buildChiTietIssueNoteText({
    issueType: params.issueType,
    note: params.note,
    oldNote: snapshot.ghi_chu,
    oldBoId: snapshot.bo_dung_cu_id,
  });

  const { error: ue } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .update({
      ghi_chu: nextNote,
      bo_dung_cu_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (ue) return { success: false, error: ue.message };

  return { success: true, snapshot };
}

/** Ghi sổ `cssd_fact_kho_giao_dich` (BAO_HONG / BAO_MAT). Caller phải verify quyền. */
export async function insertInstrumentIssueLedgerCore(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    issueType: InstrumentIssueType;
    quantity: number;
    boDungCuId?: string | null;
    quyTrinhId?: string | null;
    note?: string;
  },
): Promise<{ success: true } | { success: false; error: string }> {
  const loaiId = String(params.loaiDungCuId || "").trim();
  if (!loaiId) return { success: false, error: "Thiếu id loại dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false, error: "Số lượng sự cố phải lớn hơn 0." };

  const { error } = await supabase.from("cssd_fact_kho_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: params.boDungCuId || null,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: params.issueType === "HONG" ? "BAO_HONG" : "BAO_MAT",
    so_luong_thay_doi: -quantity,
    ghi_chu: String(params.note || "").trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
