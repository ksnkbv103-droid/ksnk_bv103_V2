/**
 * Ghép xu hướng tuần từng bảng kiểm → multi-series chart (không dùng CCS).
 */

import { format, parseISO, startOfMonth, startOfQuarter, startOfYear, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { rateFromTotals } from "@/lib/analytics/supervision-metrics";
import type { BaoCaoTrendGranularity } from "../types/bao-cao-tong-hop.types";

export const CHUYEN_DE_LINE_COLORS = [
  "#0ea5e9",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#ec4899",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
] as const;

export const MAX_CHUYEN_DE_TREND_LINES = 12;

export type ChuyenDeWeekPoint = {
  label: string;
  min_date: string;
  tong_quan_sat: number;
  tong_dat: number;
  ty_le_tuan_thu: number | null;
};

export type ChuyenDeTrendSeries = {
  ma_bk: string;
  name: string;
  dataKey: string;
  weeks: ChuyenDeWeekPoint[];
};

export function bkTrendDataKey(maBk: string): string {
  return `bk_${maBk.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function bucketKey(minDate: string, granularity: BaoCaoTrendGranularity): string {
  const d = parseISO(`${minDate}T12:00:00`);
  if (granularity === "month") return format(startOfMonth(d), "yyyy-MM");
  if (granularity === "quarter") return format(startOfQuarter(d), "yyyy-'Q'Q");
  if (granularity === "year") return format(startOfYear(d), "yyyy");
  return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function bucketLabel(minDate: string, granularity: BaoCaoTrendGranularity): string {
  const d = parseISO(`${minDate}T12:00:00`);
  if (granularity === "month") return format(startOfMonth(d), "MM/yyyy", { locale: vi });
  if (granularity === "quarter") return format(startOfQuarter(d), "'Q'Q/yyyy", { locale: vi });
  if (granularity === "year") return format(startOfYear(d), "yyyy");
  return format(startOfWeek(d, { weekStartsOn: 1 }), "'T'II/yyyy", { locale: vi });
}

/** Gộp nhiều series BK thành rows Recharts; chỉ giữ bucket có ≥1 series có mẫu số > 0. */
export function mergeMultiChuyenDeTrendRows(
  series: ChuyenDeTrendSeries[],
  granularity: BaoCaoTrendGranularity,
): Record<string, string | number | null>[] {
  type Acc = { label: string; min_date: string; byKey: Map<string, { tong: number; dat: number }> };
  const buckets = new Map<string, Acc>();

  for (const s of series) {
    for (const w of s.weeks) {
      if ((w.tong_quan_sat ?? 0) <= 0) continue;
      const key = bucketKey(w.min_date, granularity);
      let acc = buckets.get(key);
      if (!acc) {
        acc = { label: bucketLabel(w.min_date, granularity), min_date: w.min_date, byKey: new Map() };
        buckets.set(key, acc);
      } else if (w.min_date < acc.min_date) {
        acc.min_date = w.min_date;
        acc.label = bucketLabel(w.min_date, granularity);
      }
      const cur = acc.byKey.get(s.dataKey) ?? { tong: 0, dat: 0 };
      cur.tong += w.tong_quan_sat;
      cur.dat += w.tong_dat;
      acc.byKey.set(s.dataKey, cur);
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[1].min_date.localeCompare(b[1].min_date))
    .map(([, acc]) => {
      const row: Record<string, string | number | null> = {
        label: acc.label,
        min_date: acc.min_date,
      };
      for (const s of series) {
        const cell = acc.byKey.get(s.dataKey);
        row[s.dataKey] = cell && cell.tong > 0 ? rateFromTotals(cell.dat, cell.tong) : null;
      }
      return row;
    });
}

export function toChuyenDeTrendSeries(
  maBk: string,
  tenBangKiem: string | null | undefined,
  weeks: ChuyenDeWeekPoint[],
): ChuyenDeTrendSeries {
  const ten = String(tenBangKiem || "").trim();
  return {
    ma_bk: maBk,
    name: ten ? `${maBk} · ${ten}` : maBk,
    dataKey: bkTrendDataKey(maBk),
    weeks: weeks.filter((w) => (w.tong_quan_sat ?? 0) > 0),
  };
}
