/**
 * Khối chuyên đề «Vệ sinh tay» — 3 mẫu QT.07, không gộp form / không gộp %.
 * Catalog GSC: BM.07.02 / BM.07.03 (seed canonical-36). BM.01 = WHO → `/giam-sat-vst` (không picker BK).
 */

export const VE_SINH_TAY_TOPIC_ID = "ve-sinh-tay" as const;

/** Mã QT trên giấy (KSNK.QT.07.BM.0x) — neo nghiệp vụ. */
export type VeSinhTayQtMa = "BM.01" | "BM.02" | "BM.03";

export type VeSinhTayEntry = {
  qtMa: VeSinhTayQtMa;
  /** Mã `gstt_dm_bang_kiem.ma_bk` khi là form GSC; null với WHO. */
  catalogMaBk: string | null;
  label: string;
  hint: string;
  /** Deep-link form nhập. */
  href: string;
  kind: "who" | "gsc";
};

const GSC_TUAN_THU = "/giam-sat-chung/tuan-thu";

/** SSOT 3 cổng nhập khối Vệ sinh tay. */
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
    catalogMaBk: "BM.07.02",
    label: "Kỹ thuật VST thường quy",
    hint: "KSNK.QT.07.BM.02 → catalog BM.07.02",
    href: `${GSC_TUAN_THU}?bk=BM.07.02`,
    kind: "gsc",
  },
  {
    qtMa: "BM.03",
    catalogMaBk: "BM.07.03",
    label: "VST ngoại khoa",
    hint: "KSNK.QT.07.BM.03 → catalog BM.07.03",
    href: `${GSC_TUAN_THU}?bk=BM.07.03`,
    kind: "gsc",
  },
] as const;

/** Mã BK GSC thuộc khối Vệ sinh tay (không gồm WHO). */
export const VE_SINH_TAY_GSC_MA_BK = VE_SINH_TAY_ENTRIES.filter(
  (e): e is VeSinhTayEntry & { catalogMaBk: string } => e.catalogMaBk != null,
).map((e) => e.catalogMaBk);

export function gscHrefForVeSinhTayBk(maBk: string): string {
  return `${GSC_TUAN_THU}?bk=${encodeURIComponent(maBk.trim())}`;
}

export function findVeSinhTayEntryByCatalogMa(maBk: string): VeSinhTayEntry | undefined {
  const key = maBk.trim().toUpperCase();
  return VE_SINH_TAY_ENTRIES.find((e) => e.catalogMaBk?.toUpperCase() === key);
}
