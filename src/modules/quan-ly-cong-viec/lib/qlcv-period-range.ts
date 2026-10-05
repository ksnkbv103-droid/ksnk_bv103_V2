/**
 * Khoảng kỳ in / lọc Điều hành — tuần (ISO, thứ Hai), tháng, quý, năm theo ngày Asia/Ho_Chi_Minh.
 */

import { qlcvDateVnFromInstant, qlcvTodayVn } from "./qlcv-today-vn";

export type QlcvPeriodKind = "WEEK" | "MONTH" | "QUARTER" | "YEAR";

export type QlcvPeriodRange = {
  kind: QlcvPeriodKind;
  startIso: string;
  endIso: string;
  label: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function vnParts(ref: Date): { y: number; m: number; d: number } {
  const s = qlcvTodayVn(ref);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  return { y: y!, m: m!, d: d! };
}

/** @deprecated dùng format theo ngày VN — giữ tên để tương thích import cũ. */
export function formatIsoDateOnlyUtc(d: Date): string {
  return qlcvDateVnFromInstant(d);
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Ngày lịch (UTC noon) từ Y-M-D — tránh lệch khi cộng ngày. */
function utcNoonFromYmd(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Thứ Hai của tuần ISO chứa ngày lịch VN của `ref`. */
export function startOfIsoWeekUtc(ref: Date): Date {
  const { y, m, d } = vnParts(ref);
  const noon = utcNoonFromYmd(y, m, d);
  const day = noon.getUTCDay(); // 0=CN … 6=T7
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(Date.UTC(y, m - 1, d + diffToMon, 12, 0, 0));
  return mon;
}

export function resolveQlcvPeriodRange(kind: QlcvPeriodKind, ref: Date = new Date()): QlcvPeriodRange {
  const { y, m } = vnParts(ref);

  if (kind === "WEEK") {
    const start = startOfIsoWeekUtc(ref);
    const sy = start.getUTCFullYear();
    const sm = start.getUTCMonth() + 1;
    const sd = start.getUTCDate();
    const end = new Date(Date.UTC(sy, sm - 1, sd + 6, 12, 0, 0));
    const startIso = ymd(sy, sm, sd);
    const endIso = ymd(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate());
    return {
      kind,
      startIso,
      endIso,
      label: `Tuần ${startIso} → ${endIso}`,
    };
  }

  if (kind === "MONTH") {
    const startIso = ymd(y, m, 1);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const endIso = ymd(y, m, last);
    return {
      kind,
      startIso,
      endIso,
      label: `Tháng ${pad2(m)}/${y}`,
    };
  }

  if (kind === "QUARTER") {
    const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
    const startIso = ymd(y, qStartMonth, 1);
    const endMonth = qStartMonth + 2;
    const last = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
    const endIso = ymd(y, endMonth, last);
    const q = Math.floor((m - 1) / 3) + 1;
    return {
      kind,
      startIso,
      endIso,
      label: `Quý ${q}/${y}`,
    };
  }

  return {
    kind,
    startIso: ymd(y, 1, 1),
    endIso: ymd(y, 12, 31),
    label: `Năm ${y}`,
  };
}

export function labelQlcvPeriodKind(kind: QlcvPeriodKind): string {
  if (kind === "WEEK") return "Tuần";
  if (kind === "MONTH") return "Tháng";
  if (kind === "QUARTER") return "Quý";
  return "Năm";
}

/** Dịch kỳ theo số bước (vd. tuần ±1) quanh `ref` (ngày VN). */
export function resolveQlcvPeriodRangeShifted(
  kind: QlcvPeriodKind,
  shift: number,
  ref: Date = new Date(),
): QlcvPeriodRange {
  if (kind === "WEEK") {
    const base = startOfIsoWeekUtc(ref);
    const shifted = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + shift * 7, 12, 0, 0),
    );
    return resolveQlcvPeriodRange("WEEK", shifted);
  }
  const { y, m } = vnParts(ref);
  if (kind === "MONTH") {
    const shifted = new Date(Date.UTC(y, m - 1 + shift, 15, 12, 0, 0));
    return resolveQlcvPeriodRange("MONTH", shifted);
  }
  if (kind === "QUARTER") {
    const shifted = new Date(Date.UTC(y, m - 1 + shift * 3, 15, 12, 0, 0));
    return resolveQlcvPeriodRange("QUARTER", shifted);
  }
  const shifted = new Date(Date.UTC(y + shift, 6, 1, 12, 0, 0));
  return resolveQlcvPeriodRange("YEAR", shifted);
}
