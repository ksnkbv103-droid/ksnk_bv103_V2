/**
 * GSC-02 / VST-04 — map short ↔ dài để gộp thống kê theo chủ đề.
 * Nguồn: bang-kiem-seed/03-gap (sau sửa dòng 25/41 — không map nhật ký).
 */

/** Cặp chắc (Domain/gap khớp chủ đề). Không gồm BM.19.02 / BM.QĐ.17.01 (nhật ký). */
export const GSC_BK_SHORT_LONG_PAIRS: ReadonlyArray<{ short: string; long: string; note?: string }> = [
  { short: "BM.07.02", long: "KSNK.QT.07.BM.02" },
  { short: "BM.07.03", long: "KSNK.QT.07.BM.03" },
  { short: "BM.03.03", long: "KSNK.QT.03.BM.03" },
  { short: "BM.08.01", long: "KSNK.QT.08.BM.01" },
  { short: "BM.09.01", long: "KSNK.QT.09.BM.01" },
  { short: "BM.12.01", long: "KSNK.QT.12.BM.01" },
  { short: "BM.14.01", long: "KSNK.QT.14.BM.01" },
  { short: "BM.15.01", long: "KSNK.QT.15.BM.01" },
  { short: "BM.16.01", long: "KSNK.QT.16.BM.01" },
  { short: "BM.17.01", long: "KSNK.QT.17.BM.01" },
  { short: "BM.18.02", long: "KSNK.QT.18.BM.02" },
  { short: "BM.20.02", long: "KSNK.QT.20.BM.01", note: "lệch số .02 vs .01" },
  { short: "BM.21.04", long: "KSNK.QT.22.BM.04", note: "lệch QT số" },
  { short: "BM.24.02", long: "KSNK.QT.29.BM.02", note: "lệch QT 24→29" },
  { short: "BM.25.01", long: "KSNK.QT.30.BM.01", note: "lệch QT 25→30" },
  { short: "BM.25.03", long: "KSNK.QT.30.BM.02", note: "lệch QT 25→30" },
  { short: "BM.26.01", long: "KSNK.QT.32.BM.01", note: "lệch QT 26→32" },
  { short: "BM.27.01", long: "KSNK.QT.31.BM.01", note: "CAUTI gộp" },
  { short: "BM.27.02", long: "KSNK.QT.31.BM.01", note: "CAUTI gộp" },
  { short: "BM.31.03", long: "KSNK.QT.36.BM.03", note: "lệch QT 31→36" },
  { short: "BM.QĐ.02.01", long: "KSNK.QĐ.08.BM.01" },
  { short: "BM.QĐ.03.01", long: "KSNK.QĐ.09.BM.01" },
  { short: "BM.QĐ.09.01", long: "KSNK.QĐ.16.BM.01" },
  { short: "BM.QĐ.12.01", long: "KSNK.QĐ.14.BM.01" },
  { short: "BM.QĐ.16.01", long: "KSNK.QĐ.19.BM.01" },
  { short: "BM.QĐ.18.02", long: "KSNK.QĐ.21.BM.02" },
];

const shortToCanonical = new Map<string, string>();
const longToCanonical = new Map<string, string>();
const groupMembers = new Map<string, string[]>();

for (const { short, long } of GSC_BK_SHORT_LONG_PAIRS) {
  const canon = long;
  shortToCanonical.set(short.toUpperCase(), canon);
  longToCanonical.set(long.toUpperCase(), canon);
  const list = groupMembers.get(canon) ?? [canon];
  if (!list.includes(short)) list.push(short);
  if (!list.includes(long)) list.push(long);
  groupMembers.set(canon, list);
}

export function canonicalizeBangKiemMaForStats(ma: string | null | undefined): string {
  const key = String(ma || "").trim().toUpperCase();
  if (!key) return "";
  return shortToCanonical.get(key) || longToCanonical.get(key) || String(ma || "").trim();
}

/** Mọi mã trong cùng nhóm chủ đề (short + dài). */
export function resolveBangKiemGroupMas(ma: string | null | undefined): string[] {
  const canon = canonicalizeBangKiemMaForStats(ma);
  if (!canon) return [];
  const members = groupMembers.get(canon);
  if (members?.length) return [...members];
  return [canon];
}

export type BkStatRow = {
  ma_bk: string;
  tong_phien?: number | null;
  tong_quan_sat?: number | null;
  tong_dat?: number | null;
  tong_vi_pham?: number | null;
  ty_le_tuan_thu?: number | null;
  ten_bang_kiem?: string | null;
  [key: string]: unknown;
};

/** Gộp hai mã cùng chủ đề → 1 dòng báo cáo (canonical = mã dài). */
export function mergeBkStatRowsByTopic<T extends BkStatRow>(rows: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    const key = canonicalizeBangKiemMaForStats(row.ma_bk) || row.ma_bk;
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  const out: T[] = [];
  for (const [canon, list] of buckets) {
    if (list.length === 1) {
      out.push({ ...list[0], ma_bk: canon });
      continue;
    }
    const tong_phien = list.reduce((s, r) => s + Number(r.tong_phien ?? 0), 0);
    const tong_quan_sat = list.reduce((s, r) => s + Number(r.tong_quan_sat ?? 0), 0);
    const tong_dat = list.reduce((s, r) => s + Number(r.tong_dat ?? 0), 0);
    const tong_vi_pham = list.reduce((s, r) => s + Number(r.tong_vi_pham ?? 0), 0);
    const ty =
      tong_quan_sat > 0 ? Math.round((tong_dat / tong_quan_sat) * 10000) / 100 : null;
    const preferLong = list.find((r) => r.ma_bk === canon) ?? list[0];
    out.push({
      ...preferLong,
      ma_bk: canon,
      tong_phien,
      tong_quan_sat,
      tong_dat,
      tong_vi_pham,
      ty_le_tuan_thu: ty as T["ty_le_tuan_thu"],
    });
  }
  return out;
}
