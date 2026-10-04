/**
 * Khối chuyên đề «Vệ sinh tay» — 3 mẫu QT.07, không gộp form / không gộp %.
 * Prod `gstt_dm_bang_kiem.ma_bk` = KSNK.QT.07.BM.02|03; hub/legacy còn ?bk=BM.07.02|03.
 * Alias SSOT dưới đây — lookup thử mọi candidate, không migrate ma_bk.
 * BM.01 = WHO → `/giam-sat-vst` (không picker BK).
 */

export const VE_SINH_TAY_TOPIC_ID = "ve-sinh-tay" as const;

/** Mã QT trên giấy (KSNK.QT.07.BM.0x) — neo nghiệp vụ. */
export type VeSinhTayQtMa = "BM.01" | "BM.02" | "BM.03";

export type VeSinhTayEntry = {
  qtMa: VeSinhTayQtMa;
  /** Mã `gstt_dm_bang_kiem.ma_bk` khi là form GSC; null với WHO. Prefer form dài tồn tại trên prod. */
  catalogMaBk: string | null;
  label: string;
  hint: string;
  /** Deep-link form nhập. */
  href: string;
  kind: "who" | "gsc";
};

const GSC_TUAN_THU = "/giam-sat-chung/tuan-thu";

/**
 * SSOT alias: short hub/legacy ↔ prod ma_bk.
 * Mỗi cặp hai chiều: BM.07.0x ↔ KSNK.QT.07.BM.0x.
 */
export const VE_SINH_TAY_MA_BK_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["BM.07.02", "KSNK.QT.07.BM.02"],
  ["BM.07.03", "KSNK.QT.07.BM.03"],
] as const;

export function normalizeBangKiemMa(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

/**
 * Candidates `ma_bk` để thử khi lookup (exact trước, rồi alias).
 * Không UUID — caller tách UUID path riêng.
 */
export function resolveBangKiemMaCandidates(raw: string | null | undefined): string[] {
  const ma = normalizeBangKiemMa(raw);
  if (!ma) return [];
  const out: string[] = [ma];
  for (const [short, long] of VE_SINH_TAY_MA_BK_ALIASES) {
    const s = short.toUpperCase();
    const l = long.toUpperCase();
    if (ma === s && !out.includes(l)) out.push(l);
    if (ma === l && !out.includes(s)) out.push(s);
  }
  return out;
}

/** SSOT 3 cổng nhập khối Vệ sinh tay — href dùng ma_bk dài (prod). */
export const VE_SINH_TAY_ENTRIES: readonly VeSinhTayEntry[] = [
  {
    qtMa: "BM.01",
    catalogMaBk: null,
    label: "WHO 5 thời điểm",
    hint: "KSNK.QT.07.BM.01 — lưới cơ hội vệ sinh tay",
    href: "/giam-sat-vst",
    kind: "who",
  },
  {
    qtMa: "BM.02",
    catalogMaBk: "KSNK.QT.07.BM.02",
    label: "Kỹ thuật VST thường quy",
    hint: "KSNK.QT.07.BM.02",
    href: `${GSC_TUAN_THU}?bk=KSNK.QT.07.BM.02`,
    kind: "gsc",
  },
  {
    qtMa: "BM.03",
    catalogMaBk: "KSNK.QT.07.BM.03",
    label: "VST ngoại khoa",
    hint: "KSNK.QT.07.BM.03",
    href: `${GSC_TUAN_THU}?bk=KSNK.QT.07.BM.03`,
    kind: "gsc",
  },
] as const;

/** Mã BK GSC thuộc khối Vệ sinh tay (canonical prod — không gồm WHO). */
export const VE_SINH_TAY_GSC_MA_BK = VE_SINH_TAY_ENTRIES.filter(
  (e): e is VeSinhTayEntry & { catalogMaBk: string } => e.catalogMaBk != null,
).map((e) => e.catalogMaBk);

export function gscHrefForVeSinhTayBk(maBk: string): string {
  return `${GSC_TUAN_THU}?bk=${encodeURIComponent(maBk.trim())}`;
}

export function findVeSinhTayEntryByCatalogMa(maBk: string): VeSinhTayEntry | undefined {
  const candidates = new Set(resolveBangKiemMaCandidates(maBk));
  if (candidates.size === 0) return undefined;
  return VE_SINH_TAY_ENTRIES.find((e) => {
    if (!e.catalogMaBk) return false;
    return resolveBangKiemMaCandidates(e.catalogMaBk).some((c) => candidates.has(c));
  });
}

/** Mã họ WHO — không vào picker bảng kiểm GSC. */
export const VE_SINH_TAY_WHO_EXCLUDED_MA_BK = [
  "BM.07.01",
  "VST_WHO",
  "KSNK.QT.07.BM.01",
] as const;

/** BM.01 / WHO — không chọn như BK thường trên form GSC. */
export function isWhoObservationBangKiem(maBk: string | null | undefined): boolean {
  const ma = normalizeBangKiemMa(maBk);
  if (!ma) return false;
  if ((VE_SINH_TAY_WHO_EXCLUDED_MA_BK as readonly string[]).includes(ma)) return true;
  return ma.endsWith("QT.07.BM.01") || ma === "BM.07.01";
}

export function filterOutWhoBangKiemRows<T extends { ma_bk?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isWhoObservationBangKiem(r.ma_bk));
}

/** True nếu ma (short hoặc long) thuộc BM.02/BM.03 GSC VST. */
export function isVeSinhTayGscBangKiem(maBk: string | null | undefined): boolean {
  const ma = normalizeBangKiemMa(maBk);
  if (!ma) return false;
  return VE_SINH_TAY_ENTRIES.some((e) => {
    if (!e.catalogMaBk) return false;
    return resolveBangKiemMaCandidates(e.catalogMaBk).some((c) => c === ma);
  });
}
