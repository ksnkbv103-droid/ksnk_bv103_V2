import { format, parseISO, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { vi } from "date-fns/locale";
import type { BaoCaoTrendGranularity } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { roundPercent2 } from "@/lib/analytics/supervision-percent";

export type SupervisionTrendPoint = {
  label: string;
  min_date: string;
  tong: number;
  dat: number;
  ty_le_tuan_thu: number;
};

export const SUPERVISION_TREND_GRANULARITY_OPTIONS: { id: BaoCaoTrendGranularity; label: string }[] = [
  { id: "week", label: "Theo tuần" },
  { id: "month", label: "Theo tháng" },
  { id: "quarter", label: "Theo quý" },
  { id: "year", label: "Theo năm" },
];

type VstTrendRow = VstStrategicPayload["trendline"][number];
type GscTrendRow = GscStrategicPayload["trendline"][number];

function rateFromTotals(dat: number, tong: number): number {
  if (tong <= 0) return 0;
  return roundPercent2((dat * 100) / tong);
}

function finalizeSupervisionTrendPoint(row: {
  label: string;
  min_date: string;
  tong: number;
  dat: number;
}): SupervisionTrendPoint {
  return {
    ...row,
    ty_le_tuan_thu: rateFromTotals(row.dat, row.tong),
  };
}

export function normalizeVstTrendline(rows: VstTrendRow[]): SupervisionTrendPoint[] {
  return (rows ?? []).map((r) =>
    finalizeSupervisionTrendPoint({
      label: r.label,
      min_date: r.min_date,
      tong: Number(r.tong_co_hoi ?? 0),
      dat: Number(r.da_tuan_thu ?? 0),
    }),
  );
}

export function normalizeGscTrendline(rows: GscTrendRow[]): SupervisionTrendPoint[] {
  return (rows ?? []).map((r) =>
    finalizeSupervisionTrendPoint({
      label: r.label,
      min_date: r.min_date,
      tong: Number(r.tong_quan_sat ?? 0),
      dat: Number(r.tong_dat ?? 0),
    }),
  );
}

/** Gộp trend theo bucket — cộng mẫu số/mẫu tử rồi tính % (không trung bình % từng tuần). */
function bucketSupervisionTrendBy(
  points: SupervisionTrendPoint[],
  bucketStart: (d: Date) => Date,
  bucketKey: (d: Date) => string,
  bucketLabel: (d: Date) => string,
): SupervisionTrendPoint[] {
  const buckets = new Map<string, { label: string; min_date: string; tong: number; dat: number }>();
  for (const p of points) {
    const anchor = bucketStart(parseISO(`${p.min_date}T12:00:00`));
    const key = bucketKey(anchor);
    const cur = buckets.get(key) ?? {
      label: bucketLabel(anchor),
      min_date: format(anchor, "yyyy-MM-dd"),
      tong: 0,
      dat: 0,
    };
    cur.tong += Number(p.tong ?? 0);
    cur.dat += Number(p.dat ?? 0);
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => finalizeSupervisionTrendPoint(row));
}

export function bucketSupervisionTrendByMonth(points: SupervisionTrendPoint[]): SupervisionTrendPoint[] {
  return bucketSupervisionTrendBy(
    points,
    startOfMonth,
    (d) => format(d, "yyyy-MM"),
    (d) => format(d, "MM/yyyy", { locale: vi }),
  );
}

export function bucketSupervisionTrendByQuarter(points: SupervisionTrendPoint[]): SupervisionTrendPoint[] {
  return bucketSupervisionTrendBy(
    points,
    startOfQuarter,
    (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`,
    (d) => `Q${Math.floor(d.getMonth() / 3) + 1}/${d.getFullYear()}`,
  );
}

export function bucketSupervisionTrendByYear(points: SupervisionTrendPoint[]): SupervisionTrendPoint[] {
  return bucketSupervisionTrendBy(
    points,
    startOfYear,
    (d) => String(d.getFullYear()),
    (d) => String(d.getFullYear()),
  );
}

export function pickSupervisionTrend(
  points: SupervisionTrendPoint[],
  granularity: BaoCaoTrendGranularity,
): SupervisionTrendPoint[] {
  switch (granularity) {
    case "month":
      return bucketSupervisionTrendByMonth(points);
    case "quarter":
      return bucketSupervisionTrendByQuarter(points);
    case "year":
      return bucketSupervisionTrendByYear(points);
    default:
      return points;
  }
}
