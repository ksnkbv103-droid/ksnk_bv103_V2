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

/** Compact C/I summary for list/Kanban: count in cell, names in title when map present. */
export function formatQlcvCiSummary(
  phoiHopIds: unknown,
  theoDoiIds: unknown,
  options: { id: string; label: string }[] = [],
): { text: string; title: string; empty: boolean } {
  const cIds = normalizeQlcvStaffIdList(phoiHopIds);
  const iIds = normalizeQlcvStaffIdList(theoDoiIds);
  if (cIds.length === 0 && iIds.length === 0) {
    return { text: "—", title: "", empty: true };
  }
  const map = new Map(options.map((o) => [o.id, o.label]));
  const nameOf = (id: string) => map.get(id) || "";
  const namesOf = (ids: string[]) =>
    ids.map((id) => nameOf(id) || id.slice(0, 8)).filter(Boolean).join(", ");

  const shortPart = (letter: string, ids: string[]): string | null => {
    if (ids.length === 0) return null;
    if (ids.length === 1) {
      const n = nameOf(ids[0]!);
      if (n) {
        const clipped = n.length > 14 ? `${n.slice(0, 13)}…` : n;
        return `${letter} ${clipped}`;
      }
      return `${letter}·1`;
    }
    return `${letter}·${ids.length}`;
  };

  const parts = [shortPart("C", cIds), shortPart("I", iIds)].filter(Boolean) as string[];
  const titleBits: string[] = [];
  if (cIds.length) titleBits.push(`Phối hợp (C): ${namesOf(cIds)}`);
  if (iIds.length) titleBits.push(`Theo dõi (I): ${namesOf(iIds)}`);
  return { text: parts.join(" · "), title: titleBits.join(" · "), empty: false };
}


/** Domain A: chip Phối hợp (không gộp C/I cryptic). Theo dõi chỉ hiện ở detail. */
export function formatQlcvPhoiHopChips(
  phoiHopIds: unknown,
  options: { id: string; label: string }[] = [],
  maxVisible = 3,
): { chips: { id: string; label: string }[]; extra: number; empty: boolean; title: string } {
  const ids = normalizeQlcvStaffIdList(phoiHopIds);
  if (ids.length === 0) {
    return { chips: [], extra: 0, empty: true, title: "" };
  }
  const map = new Map(options.map((o) => [o.id, o.label]));
  const all = ids.map((id) => {
    const full = map.get(id) || id.slice(0, 8);
    const short = full.length > 12 ? `${full.slice(0, 11)}…` : full;
    return { id, label: short };
  });
  const chips = all.slice(0, maxVisible);
  const extra = Math.max(0, all.length - chips.length);
  const title = ids.map((id) => map.get(id) || id.slice(0, 8)).join(", ");
  return { chips, extra, empty: false, title: `Phối hợp: ${title}` };
}

/** Initials avatar label (1–2 chars) from display name. */
export function qlcvAssigneeInitials(name: string | null | undefined): string {
  const raw = String(name ?? "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
