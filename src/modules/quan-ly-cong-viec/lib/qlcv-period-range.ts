/**
 * Khoảng kỳ in / lọc Điều hành — tuần (ISO, bắt đầu thứ Hai UTC), tháng, quý, năm.
 */

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

export function formatIsoDateOnlyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Thứ Hai của tuần chứa `ref` (ISO week, UTC). */
export function startOfIsoWeekUtc(ref: Date): Date {
  const d = startOfUtcDay(ref);
  const day = d.getUTCDay(); // 0=CN … 6=T7
  const diffToMon = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMon));
}

export function resolveQlcvPeriodRange(kind: QlcvPeriodKind, ref: Date = new Date()): QlcvPeriodRange {
  const d = startOfUtcDay(ref);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();

  if (kind === "WEEK") {
    const start = startOfIsoWeekUtc(d);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
    return {
      kind,
      startIso: formatIsoDateOnlyUtc(start),
      endIso: formatIsoDateOnlyUtc(end),
      label: `Tuần ${formatIsoDateOnlyUtc(start)} → ${formatIsoDateOnlyUtc(end)}`,
    };
  }

  if (kind === "MONTH") {
    const start = new Date(Date.UTC(y, m, 1));
    const end = new Date(Date.UTC(y, m + 1, 0));
    return {
      kind,
      startIso: formatIsoDateOnlyUtc(start),
      endIso: formatIsoDateOnlyUtc(end),
      label: `Tháng ${pad2(m + 1)}/${y}`,
    };
  }

  if (kind === "QUARTER") {
    const qStartMonth = Math.floor(m / 3) * 3;
    const start = new Date(Date.UTC(y, qStartMonth, 1));
    const end = new Date(Date.UTC(y, qStartMonth + 3, 0));
    const q = Math.floor(m / 3) + 1;
    return {
      kind,
      startIso: formatIsoDateOnlyUtc(start),
      endIso: formatIsoDateOnlyUtc(end),
      label: `Quý ${q}/${y}`,
    };
  }

  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31));
  return {
    kind,
    startIso: formatIsoDateOnlyUtc(start),
    endIso: formatIsoDateOnlyUtc(end),
    label: `Năm ${y}`,
  };
}

export function labelQlcvPeriodKind(kind: QlcvPeriodKind): string {
  if (kind === "WEEK") return "Tuần";
  if (kind === "MONTH") return "Tháng";
  if (kind === "QUARTER") return "Quý";
  return "Năm";
}

/** ISO date trong khoảng [start, end] inclusive. */
function isoDateInRange(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

/** Dịch kỳ theo số bước (vd. tuần ±1) quanh `ref`. */
export function resolveQlcvPeriodRangeShifted(
  kind: QlcvPeriodKind,
  shift: number,
  ref: Date = new Date(),
): QlcvPeriodRange {
  if (kind === "WEEK") {
    const base = startOfIsoWeekUtc(ref);
    const shifted = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + shift * 7),
    );
    return resolveQlcvPeriodRange("WEEK", shifted);
  }
  if (kind === "MONTH") {
    const d = startOfUtcDay(ref);
    const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + shift, 1));
    return resolveQlcvPeriodRange("MONTH", shifted);
  }
  if (kind === "QUARTER") {
    const d = startOfUtcDay(ref);
    const shifted = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + shift * 3, 1));
    return resolveQlcvPeriodRange("QUARTER", shifted);
  }
  const d = startOfUtcDay(ref);
  const shifted = new Date(Date.UTC(d.getUTCFullYear() + shift, 0, 1));
  return resolveQlcvPeriodRange("YEAR", shifted);
}
