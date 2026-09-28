/**
 * Khi ẩn phiếu: gỡ dấu «đã phân tích» trên XN chỉ nếu phiếu này đóng dấu
 * và không còn phiếu đang hiện nào giữ XN đó.
 */

function normViSinhId(raw: string): string {
  const s = String(raw || "").trim();
  if (s.toLowerCase().startsWith("lis:")) return s.slice(4).trim();
  return s;
}

export function viSinhIdsLinkedOnCase(verification: unknown): string[] {
  const vd =
    verification && typeof verification === "object"
      ? (verification as Record<string, unknown>)
      : {};
  const raw: string[] = [];
  if (vd.index_vi_sinh_id) raw.push(String(vd.index_vi_sinh_id));
  if (Array.isArray(vd.attributed_vi_sinh_ids)) {
    for (const item of vd.attributed_vi_sinh_ids) raw.push(String(item ?? ""));
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = normViSinhId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function shouldReleaseDaPhanTichOnHide(input: {
  metadata: unknown;
  hiddenCaseId: string;
  stillClaimedByOtherActiveCase: boolean;
}): boolean {
  if (input.stillClaimedByOtherActiveCase) return false;
  const meta =
    input.metadata && typeof input.metadata === "object"
      ? (input.metadata as Record<string, unknown>)
      : {};
  if (meta.analysis_disposition !== "DA_PHAN_TICH") return false;
  const owner = String(meta.analyzed_case_id || "").trim();
  if (owner && owner !== input.hiddenCaseId) return false;
  return true;
}

export function metadataWithoutCaseAnalysisStamp(metadata: unknown): Record<string, unknown> {
  const meta =
    metadata && typeof metadata === "object"
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  delete meta.analysis_disposition;
  delete meta.analyzed_case_id;
  delete meta.analyzed_at;
  return meta;
}
