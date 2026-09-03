/**
 * So kỳ lãnh đạo: cùng độ dài kỳ lọc (tu_ngay–den_ngay) vs kỳ liền trước.
 * Tách biệt delta 2 tuần ISO trên trendline (metric-dictionary).
 */

import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

export type PeriodBounds = { tu_ngay: string; den_ngay: string };

/** Kỳ trước liền kề, cùng số ngày lịch (inclusive). */
export function previousEqualLengthPeriod(tuNgay: string, denNgay: string): PeriodBounds | null {
  const start = parseISO(`${tuNgay}T12:00:00`);
  const end = parseISO(`${denNgay}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const days = differenceInCalendarDays(end, start); // inclusive length = days + 1
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days);
  return {
    tu_ngay: format(prevStart, "yyyy-MM-dd"),
    den_ngay: format(prevEnd, "yyyy-MM-dd"),
  };
}

/** Chênh % kỳ này − kỳ trước (1 chữ số thập phân). */
export function deltaVsPriorPeriod(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null) return null;
  return Math.round((current - prior) * 10) / 10;
}

export type KyTruocCompare = {
  tu_ngay: string;
  den_ngay: string;
  ty_le_vst: number | null;
  ty_le_gsc: number | null;
  delta_vst: number | null;
  delta_gsc: number | null;
};
