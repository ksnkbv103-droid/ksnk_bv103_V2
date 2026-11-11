/** Thu hồi mẻ: gom các bộ theo nơi nhận (khoa / phòng mổ) để gọi điện — thuần, không I/O. */

export const ME_KHOA_CHUA_CAP = "Chưa cấp phát";

export type MeBoRow = { maBo: string; tenBo: string; khoaNhanId: string | null; khoaTen: string | null };
export type MeKhoaGroup = { khoaNhanId: string | null; khoaTen: string; bo: Array<{ maBo: string; tenBo: string }> };

export function groupMeBoByKhoa(rows: readonly MeBoRow[]): MeKhoaGroup[] {
  const map = new Map<string, MeKhoaGroup>();
  for (const r of rows) {
    const key = r.khoaNhanId || "";
    let g = map.get(key);
    if (!g) {
      g = { khoaNhanId: r.khoaNhanId || null, khoaTen: r.khoaNhanId ? r.khoaTen || "?" : ME_KHOA_CHUA_CAP, bo: [] };
      map.set(key, g);
    }
    g.bo.push({ maBo: r.maBo, tenBo: r.tenBo });
  }
  // Nơi đã cấp trước (cần gọi), "Chưa cấp phát" cuối; trong nhóm theo tên.
  return [...map.values()].sort((a, b) => {
    if (!a.khoaNhanId !== !b.khoaNhanId) return a.khoaNhanId ? -1 : 1;
    return a.khoaTen.localeCompare(b.khoaTen, "vi");
  });
}

export function formatMeKhoaText(maLo: string, groups: readonly MeKhoaGroup[]): string {
  const lines = [`Mẻ ${maLo}`];
  for (const g of groups) {
    lines.push(`${g.khoaTen} (${g.bo.length} bộ): ${g.bo.map((b) => b.maBo).join(", ")}`);
  }
  return lines.join("\n");
}
