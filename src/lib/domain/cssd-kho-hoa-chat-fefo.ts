/** Pure FEFO / expiry rules — kho hóa chất CSSD. */

export type FefoLotRow = {
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ton_so_luong?: number;
};

export function lotRowToKey(row: { ma_lo?: string | null; han_su_dung?: string | null }): string {
  return `${row.ma_lo ?? ""}|${row.han_su_dung ?? ""}`;
}

export function isLotExpired(han_su_dung: string | null | undefined, todayYmd?: string): boolean {
  const raw = String(han_su_dung || "").trim().slice(0, 10);
  if (!raw) return false;
  const today = todayYmd || new Date().toISOString().slice(0, 10);
  return raw < today;
}

function expirySortKey(han_su_dung: string | null | undefined): number {
  const raw = String(han_su_dung || "").trim().slice(0, 10);
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const t = new Date(`${raw}T12:00:00`).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/** Sắp lô theo HSD gần nhất trước (FEFO). Lô không HSD xếp cuối. */
export function fefoSortLots<T extends FefoLotRow>(lots: T[]): T[] {
  return [...lots].sort((a, b) => {
    const da = expirySortKey(a.han_su_dung);
    const db = expirySortKey(b.han_su_dung);
    if (da !== db) return da - db;
    return String(a.ma_lo || "").localeCompare(String(b.ma_lo || ""), "vi");
  });
}

/** Lô FEFO đầu tiên còn tồn và chưa hết hạn — dùng làm mặc định khi xuất. */
export function pickFefoLotKey(lots: FefoLotRow[], todayYmd?: string): string {
  const eligible = lots.filter((l) => (l.ton_so_luong ?? 0) > 0 && !isLotExpired(l.han_su_dung, todayYmd));
  const first = fefoSortLots(eligible)[0];
  return first ? lotRowToKey(first) : "";
}

export function isFefoLotKey(lotKey: string, lots: FefoLotRow[], todayYmd?: string): boolean {
  const fefo = pickFefoLotKey(lots, todayYmd);
  return Boolean(fefo && lotKey === fefo);
}

export function assertLotExportable(han_su_dung: string | null | undefined, todayYmd?: string): string | null {
  if (isLotExpired(han_su_dung, todayYmd)) {
    return "Không xuất lô đã quá hạn sử dụng. Hủy hoặc điều chỉnh tồn qua kiểm kê.";
  }
  return null;
}
