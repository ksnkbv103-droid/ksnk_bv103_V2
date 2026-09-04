/**
 * SSOT hiển thị ngày/giờ BV103 (không đổi cách lưu DB).
 * - Chỉ ngày: dd/mm/yyyy
 * - Chỉ giờ: hh:mm:ss
 * - Ngày+giờ: hh:mm:ss, dd/mm/yyyy
 * Múi giờ hiển thị: Asia/Ho_Chi_Minh.
 */

export type DateTimeInput = string | number | Date | null | undefined;

const TZ = "Asia/Ho_Chi_Minh";
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse input → Date hợp lệ, hoặc null. Chuỗi YYYY-MM-DD coi là ngày lịch (trưa local, tránh lệch ngày). */
export function parseDateTimeInput(value: DateTimeInput): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const dateOnly = DATE_ONLY_RE.exec(raw);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const m = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const d = new Date(y, m - 1, day, 12, 0, 0);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

type TzParts = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  second: string;
};

function partsInVn(d: Date): TzParts | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const bag: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
    for (const p of fmt.formatToParts(d)) {
      if (p.type !== "literal") bag[p.type] = p.value;
    }
    const hour = bag.hour === "24" ? "00" : bag.hour;
    if (!bag.day || !bag.month || !bag.year || !hour || !bag.minute || !bag.second) {
      return null;
    }
    return {
      day: bag.day,
      month: bag.month,
      year: bag.year,
      hour,
      minute: bag.minute,
      second: bag.second,
    };
  } catch {
    return null;
  }
}

/** Chỉ ngày → `dd/mm/yyyy`. */
export function formatDateVi(value: DateTimeInput, empty = "—"): string {
  const d = parseDateTimeInput(value);
  if (!d) return empty;
  const dateOnly = typeof value === "string" ? DATE_ONLY_RE.exec(value.trim()) : null;
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const p = partsInVn(d);
  if (!p) return empty;
  return `${p.day}/${p.month}/${p.year}`;
}

/** Chỉ giờ → `hh:mm:ss`. */
export function formatTimeVi(value: DateTimeInput, empty = "—"): string {
  const d = parseDateTimeInput(value);
  if (!d) return empty;
  const p = partsInVn(d);
  if (!p) return empty;
  return `${p.hour}:${p.minute}:${p.second}`;
}

/** Ngày + giờ gần nhau → `hh:mm:ss, dd/mm/yyyy`. */
export function formatDateTimeVi(value: DateTimeInput, empty = "—"): string {
  const d = parseDateTimeInput(value);
  if (!d) return empty;
  const p = partsInVn(d);
  if (!p) return empty;
  return `${p.hour}:${p.minute}:${p.second}, ${p.day}/${p.month}/${p.year}`;
}

/** Alias rõ nghĩa cho chỗ gọi cũ. */
export const formatNgayVi = formatDateVi;
export const formatGioVi = formatTimeVi;
export const formatNgayGioVi = formatDateTimeVi;

/** Fallback pad khi cần format từ y/m/d/h/m/s thô (UTC calendar). */
export function formatDatePartsVi(y: number, m: number, d: number): string {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

/** YYYY-MM-DD theo lịch vận hành BV103 (Asia/Ho_Chi_Minh) — cổng BD/FEFO/HSD. */
export function todayYmdInVn(d = new Date()): string {
  const p = partsInVn(d);
  if (!p) return d.toISOString().slice(0, 10);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Cộng/trừ ngày trên YYYY-MM-DD — UTC noon, tránh lệch lịch local↔ISO. */
export function addDaysYmd(ymd: string, days: number): string {
  const raw = String(ymd || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const t = Date.parse(`${raw}T12:00:00Z`);
  if (!Number.isFinite(t)) return raw;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}


