/** Chuẩn hóa danh sách UUID nhân sự trên phiếu / mẫu QLCV. */

export function normalizeQlcvStaffIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function labelsForStaffIds(
  ids: string[],
  options: { id: string; label: string }[],
): string {
  if (ids.length === 0) return "—";
  const map = new Map(options.map((o) => [o.id, o.label]));
  return ids.map((id) => map.get(id) || id.slice(0, 8)).join(", ");
}
