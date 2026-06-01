/**
 * Lịch sinh phiếu định kỳ — **mirror** điều kiện `match_due` trong
 * `public.fn_fact_cong_viec_spawn_dinh_ky_hom_nay()` (Postgres `date` + `mod` tuần / `extract(day)` tháng).
 * Dùng UTC date-only để khớp `YYYY-MM-DD` không giờ.
 */

export type QlcvMaChuKyDinhKy = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

export function parseIsoDateOnlyUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatIsoDateOnlyUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetweenUtcInclusiveFloor(earlier: Date, later: Date): number {
  const a = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  const b = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  return Math.round((b - a) / 86400000);
}

function addDaysUtc(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

/**
 * `true` iff RPC would set `match_due := true` cho `due` (cùng `ma_chu_ky` + `ngay_bat_dau`).
 */
export function dinhKyMatchDueOnDate(maChuKy: QlcvMaChuKyDinhKy, ngayBatDauIso: string, due: Date): boolean {
  const anchor = parseIsoDateOnlyUtc(ngayBatDauIso);
  if (Number.isNaN(anchor.getTime())) return false;
  const d = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
  if (anchor > d) return false;
  if (maChuKy === "DAILY") {
    // Mỗi ngày từ mốc trở đi
    return true;
  }
  if (maChuKy === "WEEKLY") {
    const diff = daysBetweenUtcInclusiveFloor(anchor, d);
    return diff % 7 === 0;
  }
  if (maChuKy === "MONTHLY") {
    return d.getUTCDate() === anchor.getUTCDate();
  }
  if (maChuKy === "QUARTERLY") {
    // Khớp nếu: cùng ngày trong tháng VÀ số tháng chênh lệch chia hết cho 3
    if (d.getUTCDate() !== anchor.getUTCDate()) return false;
    const anchorMonths = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth();
    const dueMonths = d.getUTCFullYear() * 12 + d.getUTCMonth();
    return (dueMonths - anchorMonths) % 3 === 0;
  }
  return false;
}

export type NextDinhKySpawnDatesOptions = {
  /** Số ngày quét tối đa kể từ `from` (mặc định 731 ≈ 2 năm). */
  maxScanDays?: number;
  /** Số ngày khớp tối đa trả về (mặc định 12). */
  maxMatches?: number;
};

/**
 * Danh sách ngày `han_hoan_thanh` mà RPC **sẽ** cố sinh phiếu (nếu chưa tồn tại `(mẫu, hạn)`), kể từ `from` (gồm `from`).
 */
export function nextDinhKySpawnDates(
  maChuKy: QlcvMaChuKyDinhKy,
  ngayBatDauIso: string,
  from: Date,
  options?: NextDinhKySpawnDatesOptions,
): string[] {
  const maxScan = options?.maxScanDays ?? 731;
  const maxMatch = options?.maxMatches ?? 12;
  const out: string[] = [];
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < maxScan && out.length < maxMatch; i++) {
    const test = addDaysUtc(start, i);
    if (dinhKyMatchDueOnDate(maChuKy, ngayBatDauIso, test)) {
      out.push(formatIsoDateOnlyUtc(test));
    }
  }
  return out;
}
