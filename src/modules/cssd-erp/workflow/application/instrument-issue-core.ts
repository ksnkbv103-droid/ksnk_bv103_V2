import type { SupabaseClient } from "@supabase/supabase-js";

export type InstrumentIssueType = "HONG" | "MAT";

export type ChiTietIssueSnapshot = {
  ghi_chu: string;
  bo_dung_cu_id: string;
  loai_dung_cu_id: string;
  so_luong: number;
};

/**
 * Pure: ghép dòng ghi chú audit Hỏng/Mất.
 * Không tách BOM / không gợi ý detach — chuẩn BOM chỉ đổi qua phiếu đổi danh mục.
 */
export function buildChiTietIssueNoteText(params: {
  issueType: InstrumentIssueType;
  note?: string;
  oldNote: string;
  /** Giữ tham số để tương thích caller cũ; không còn dùng để detach. */
  oldBoId?: string;
  quantity?: number;
  soLuongChiTiet?: number;
  now?: string;
}): string {
  const now = params.now ?? new Date().toISOString().slice(0, 19).replace("T", " ");
  const qty = Math.max(1, Math.floor(Number(params.quantity ?? 1) || 1));
  const total = Math.max(1, Math.floor(Number(params.soLuongChiTiet ?? 1) || 1));
  const qtyLabel = qty < total ? ` (SL ${qty}/${total})` : "";
  const line = `[${params.issueType}] ${now}${qtyLabel}${params.note ? ` - ${String(params.note).trim()}` : ""}`;
  const oldNote = params.oldNote.trim();
  if (!oldNote) return line;
  return `${oldNote}\n${line}`;
}

/**
 * Ghi chú audit trên dòng chi tiết.
 * Hỏng/Mất: KHÔNG set bo_dung_cu_id=null / detach BOM — chỉ ghi chú + ledger âm (caller).
 * Đổi chuẩn BOM chỉ qua phiếu đổi danh mục. Caller phải verify quyền.
 */
export async function appendChiTietIssueNoteCore(
  supabase: SupabaseClient,
  params: { chiTietId: string; issueType: InstrumentIssueType; note?: string; quantity?: number },
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

  const quantity = Math.max(1, Number(params.quantity ?? snapshot.so_luong) || 1);
  const nextNote = buildChiTietIssueNoteText({
    issueType: params.issueType,
    note: params.note,
    oldNote: snapshot.ghi_chu,
    oldBoId: snapshot.bo_dung_cu_id,
    quantity,
    soLuongChiTiet: snapshot.so_luong,
  });

  const { error: ue } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .update({
      ghi_chu: nextNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (ue) return { success: false, error: ue.message };

  return { success: true, snapshot };
}

/**
 * @deprecated SSOT ghi sổ Hỏng/Mất/Điều chuyển = `rpc_cssd_apply_instrument_ledger`
 * (dùng trong `applyInstrumentIncidentLedger`). Helper này chỉ còn cho legacy/fallback;
 * khi có `boDungCuId` áp dụng **cùng check tồn** như RPC trước khi insert.
 * Prefer one write path: gọi RPC, không gọi hàm này từ flow sự cố mới.
 */
export async function insertInstrumentIssueLedgerCore(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    issueType: InstrumentIssueType;
    quantity: number;
    boDungCuId?: string | null;
    quyTrinhId?: string | null;
    note?: string;
    suCoId?: string | null;
  },
): Promise<{ success: true } | { success: false; error: string }> {
  const loaiId = String(params.loaiDungCuId || "").trim();
  if (!loaiId) return { success: false, error: "Thiếu id loại dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false, error: "Số lượng sự cố phải lớn hơn 0." };

  const boId = String(params.boDungCuId || "").trim() || null;
  // Mirror rpc_cssd_apply_instrument_ledger tồn check (BAO_HONG / BAO_MAT + bộ).
  if (boId) {
    const { data: ct, error: ctErr } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("so_luong")
      .eq("bo_dung_cu_id", boId)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (ctErr) return { success: false, error: ctErr.message };

    const { data: txs, error: txErr } = await supabase
      .from("cssd_fact_kho_giao_dich")
      .select("so_luong_thay_doi")
      .eq("bo_dung_cu_id", boId)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true);
    if (txErr) return { success: false, error: txErr.message };

    const chuan = Math.max(0, Number((ct as { so_luong?: number } | null)?.so_luong ?? 0) || 0);
    const delta = (txs || []).reduce(
      (n, r) => n + (Number((r as { so_luong_thay_doi?: number }).so_luong_thay_doi) || 0),
      0,
    );
    const thucTe = chuan + delta;
    if (thucTe < quantity) {
      return {
        success: false,
        error: `Số lượng vượt quá số thực tế (${thucTe}).`,
      };
    }
  }

  const { error } = await supabase.from("cssd_fact_kho_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: boId,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: params.issueType === "HONG" ? "BAO_HONG" : "BAO_MAT",
    so_luong_thay_doi: -quantity,
    ghi_chu: String(params.note || "").trim() || null,
    su_co_id: params.suCoId || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
