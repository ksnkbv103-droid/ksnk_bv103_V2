/**
 * Định mức nguồn lực giám sát (Trụ C) — cấu hình app, không hard-code trong UI số magic rải rác.
 * Cảnh báo «dưới định mức» — không đổi CCS.
 */

export const KSNK_STAFF_RESOURCE_NORMS = {
  /**
   * Phiên giám sát (VST + GSC) tối thiểu / NV / tuần lịch.
   * Kỳ lọc dài hơn → nhân theo số tuần (ceil ngày/7).
   */
  PHIEN_GS_PER_NV_PER_WEEK: 5,
  /** Máy CSSD: tỷ lệ sẵn sàng mục tiêu (READY / (READY+REPAIR)). */
  MAY_READY_PCT_TARGET: 90,
} as const;

function inclusiveDaySpan(tuNgay: string, denNgay: string): number {
  const a = Date.parse(`${tuNgay}T00:00:00Z`);
  const b = Date.parse(`${denNgay}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.floor((b - a) / 86400000) + 1;
}

export function weeksInRange(tuNgay: string, denNgay: string): number {
  return Math.max(1, Math.ceil(inclusiveDaySpan(tuNgay, denNgay) / 7));
}

/** Định mức phiên GS kỳ = PHIEN × số NV × số tuần. */
export function expectedPhienGsForPeriod(args: {
  soNv: number;
  tuNgay: string;
  denNgay: string;
  perNvPerWeek?: number;
}): number {
  const rate = args.perNvPerWeek ?? KSNK_STAFF_RESOURCE_NORMS.PHIEN_GS_PER_NV_PER_WEEK;
  const nv = Math.max(0, args.soNv);
  return nv * rate * weeksInRange(args.tuNgay, args.denNgay);
}

export function staffBelowPhienNorm(args: {
  soNv: number;
  tongPhienGs: number;
  tuNgay: string;
  denNgay: string;
}): { below: boolean; expected: number; actual: number; ratioPct: number | null } {
  const expected = expectedPhienGsForPeriod(args);
  const actual = Math.max(0, args.tongPhienGs);
  if (expected <= 0 || args.soNv <= 0) {
    return { below: false, expected, actual, ratioPct: null };
  }
  const ratioPct = Math.round((actual / expected) * 1000) / 10;
  return { below: actual < expected, expected, actual, ratioPct };
}

function mayReadyBelowNorm(ready: number | null, repairing: number | null): {
  below: boolean;
  readyPct: number | null;
  target: number;
} {
  const r = Number(ready ?? 0);
  const bad = Number(repairing ?? 0);
  const den = r + bad;
  if (den <= 0) return { below: false, readyPct: null, target: KSNK_STAFF_RESOURCE_NORMS.MAY_READY_PCT_TARGET };
  const readyPct = Math.round((r / den) * 1000) / 10;
  return {
    below: readyPct < KSNK_STAFF_RESOURCE_NORMS.MAY_READY_PCT_TARGET,
    readyPct,
    target: KSNK_STAFF_RESOURCE_NORMS.MAY_READY_PCT_TARGET,
  };
}
