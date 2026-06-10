import { addWeeks, format, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import { vi } from "date-fns/locale";
import { KHU_VUC_ZONE_LABELS, KHU_VUC_ZONE_ORDER } from "@/lib/khu-vuc-giam-sat-ui";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { NkbvDashboardPayload } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";
import type {
  BaoCaoChuyenDe,
  BaoCaoIpacZoneRow,
  BaoCaoKhoaRankRow,
  BaoCaoTrendGranularity,
  BaoCaoTrendPoint,
  BaoCaoTongHopFilters,
  BaoCaoTongHopPayload,
  SourceLoadStatus,
} from "../types/bao-cao-tong-hop.types";

const CCS_WEIGHT_VST = 0.5;
const CCS_WEIGHT_GSC = 0.5;

type TrendSlice = {
  label: string;
  min_date: string;
  ty_le: number;
  tong: number;
  dat: number;
};

function rateFromTotals(dat: number, tong: number): number | null {
  if (tong <= 0) return null;
  return Math.round((dat / tong) * 1000) / 10;
}

function finalizeTrendPoint(row: {
  label: string;
  min_date: string;
  vst_tong: number;
  vst_dat: number;
  gsc_tong: number;
  gsc_dat: number;
}): BaoCaoTrendPoint {
  const ty_le_vst = rateFromTotals(row.vst_dat, row.vst_tong);
  const ty_le_gsc = rateFromTotals(row.gsc_dat, row.gsc_tong);
  const { value: ty_le_ccs } = computeCcs(ty_le_vst, ty_le_gsc);
  return {
    label: row.label,
    min_date: row.min_date,
    ty_le_vst,
    ty_le_gsc,
    ty_le_ccs,
    vst_tong: row.vst_tong > 0 ? row.vst_tong : null,
    vst_dat: row.vst_tong > 0 ? row.vst_dat : null,
    gsc_tong: row.gsc_tong > 0 ? row.gsc_tong : null,
    gsc_dat: row.gsc_tong > 0 ? row.gsc_dat : null,
  };
}

export function computeTyLeVst(kpis: VstStrategicPayload["kpis"] | undefined): number | null {
  if (!kpis || kpis.tong_co_hoi <= 0) return null;
  return kpis.ty_le_tuan_thu;
}

export function computeTyLeGsc(kpis: GscStrategicPayload["kpis"] | undefined): number | null {
  if (!kpis || kpis.tong_quan_sat <= 0) return null;
  return kpis.ty_le_tuan_thu;
}

/** CCS chỉ từ VST+GSC (process); NKBV là outcome riêng. */
export function computeCcs(
  tyLeVst: number | null,
  tyLeGsc: number | null,
): { value: number | null; note: string | null } {
  if (tyLeVst == null && tyLeGsc == null) return { value: null, note: null };
  if (tyLeVst != null && tyLeGsc != null) {
    const value = Math.round((tyLeVst * CCS_WEIGHT_VST + tyLeGsc * CCS_WEIGHT_GSC) * 10) / 10;
    return {
      value,
      note: `Công thức: ${Math.round(CCS_WEIGHT_VST * 100)}% Tuân thủ VST + ${Math.round(CCS_WEIGHT_GSC * 100)}% Tuân thủ GSC`,
    };
  }
  const single = tyLeVst ?? tyLeGsc;
  return {
    value: single,
    note: tyLeVst != null ? "Chỉ có dữ liệu VST trong phạm vi quyền/lọc" : "Chỉ có dữ liệu GSC trong phạm vi quyền/lọc",
  };
}

export function deltaFromTrend(tyLeSeries: number[]): number | null {
  const valid = tyLeSeries.filter((x) => Number.isFinite(x));
  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2];
  const cur = valid[valid.length - 1];
  return Math.round((cur - prev) * 10) / 10;
}

/** Khóa tuần ISO (Thứ 2) — tránh tách VST/GSC cùng tuần thành 2 điểm vì min_date khác ngày. */
export function isoWeekBucketKey(minDate: string): string {
  const start = startOfWeek(parseISO(`${minDate}T12:00:00`), { weekStartsOn: 1 });
  return format(start, "yyyy-MM-dd");
}

function pointHasMetricVolume(p: BaoCaoTrendPoint, metric: "ty_le_vst" | "ty_le_gsc" | "ty_le_ccs"): boolean {
  if (metric === "ty_le_vst") return (p.vst_tong ?? 0) > 0 && p.ty_le_vst != null;
  if (metric === "ty_le_gsc") return (p.gsc_tong ?? 0) > 0 && p.ty_le_gsc != null;
  return ((p.vst_tong ?? 0) > 0 || (p.gsc_tong ?? 0) > 0) && p.ty_le_ccs != null;
}

/** So sánh tuần cuối vs tuần liền trước — chỉ khi đủ 2 tuần ISO liên tiếp có dữ liệu. */
export function deltaFromPeriodPoints(
  points: BaoCaoTrendPoint[],
  metric: "ty_le_vst" | "ty_le_gsc" | "ty_le_ccs",
): number | null {
  const eligible = points
    .filter((p) => pointHasMetricVolume(p, metric))
    .sort((a, b) => a.min_date.localeCompare(b.min_date));
  if (eligible.length < 2) return null;

  const prev = eligible[eligible.length - 2];
  const cur = eligible[eligible.length - 1];
  const prevWeek = startOfWeek(parseISO(`${prev.min_date}T12:00:00`), { weekStartsOn: 1 });
  const curWeek = startOfWeek(parseISO(`${cur.min_date}T12:00:00`), { weekStartsOn: 1 });
  const expectedCurWeek = addWeeks(prevWeek, 1);
  if (format(expectedCurWeek, "yyyy-MM-dd") !== format(curWeek, "yyyy-MM-dd")) {
    return null;
  }

  const prevRate = prev[metric] as number;
  const curRate = cur[metric] as number;
  return Math.round((curRate - prevRate) * 10) / 10;
}

function mergeTrendMaps(
  vstSlices: TrendSlice[],
  gscSlices: TrendSlice[],
): Map<
  string,
  { label: string; min_date: string; vst_tong: number; vst_dat: number; gsc_tong: number; gsc_dat: number }
> {
  const map = new Map<
    string,
    { label: string; min_date: string; vst_tong: number; vst_dat: number; gsc_tong: number; gsc_dat: number }
  >();
  for (const s of vstSlices) {
    const weekKey = isoWeekBucketKey(s.min_date);
    const cur = map.get(weekKey) ?? {
      label: s.label,
      min_date: weekKey,
      vst_tong: 0,
      vst_dat: 0,
      gsc_tong: 0,
      gsc_dat: 0,
    };
    cur.vst_tong += s.tong;
    cur.vst_dat += s.dat;
    map.set(weekKey, cur);
  }
  for (const s of gscSlices) {
    const weekKey = isoWeekBucketKey(s.min_date);
    const cur = map.get(weekKey) ?? {
      label: s.label,
      min_date: weekKey,
      vst_tong: 0,
      vst_dat: 0,
      gsc_tong: 0,
      gsc_dat: 0,
    };
    cur.gsc_tong += s.tong;
    cur.gsc_dat += s.dat;
    if (!map.has(weekKey) || cur.label === s.label) cur.label = s.label;
    map.set(weekKey, cur);
  }
  return map;
}

export function buildMergedTrend(
  vst: VstStrategicPayload | null,
  gsc: GscStrategicPayload | null,
): BaoCaoTrendPoint[] {
  const vstSlices: TrendSlice[] = (vst?.trendline ?? []).map((r) => ({
    label: r.label,
    min_date: r.min_date,
    ty_le: r.ty_le_tuan_thu,
    tong: Number(r.tong_co_hoi ?? 0),
    dat: Number(r.da_tuan_thu ?? 0),
  }));
  const gscSlices: TrendSlice[] = (gsc?.trendline ?? []).map((r) => ({
    label: r.label,
    min_date: r.min_date,
    ty_le: r.ty_le_tuan_thu,
    tong: Number(r.tong_quan_sat ?? 0),
    dat: Number(r.tong_dat ?? 0),
  }));
  const map = mergeTrendMaps(vstSlices, gscSlices);
  return [...map.values()]
    .sort((a, b) => a.min_date.localeCompare(b.min_date))
    .map((row) => finalizeTrendPoint(row));
}

/** Gộp trend theo bucket — cộng mẫu số/mẫu tử rồi tính % (không trung bình % từng tuần). */
function bucketTrendBy(
  points: BaoCaoTrendPoint[],
  bucketStart: (d: Date) => Date,
  bucketKey: (d: Date) => string,
  bucketLabel: (d: Date) => string,
): BaoCaoTrendPoint[] {
  const buckets = new Map<
    string,
    { label: string; min_date: string; vst_tong: number; vst_dat: number; gsc_tong: number; gsc_dat: number }
  >();
  for (const p of points) {
    const anchor = bucketStart(parseISO(`${p.min_date}T12:00:00`));
    const key = bucketKey(anchor);
    const cur = buckets.get(key) ?? {
      label: bucketLabel(anchor),
      min_date: format(anchor, "yyyy-MM-dd"),
      vst_tong: 0,
      vst_dat: 0,
      gsc_tong: 0,
      gsc_dat: 0,
    };
    cur.vst_tong += Number(p.vst_tong ?? 0);
    cur.vst_dat += Number(p.vst_dat ?? 0);
    cur.gsc_tong += Number(p.gsc_tong ?? 0);
    cur.gsc_dat += Number(p.gsc_dat ?? 0);
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b]) => finalizeTrendPoint(b));
}

/** Gộp theo tháng từ các điểm trend (trung bình đơn giản trong tháng). */
export function bucketTrendByMonth(points: BaoCaoTrendPoint[]): BaoCaoTrendPoint[] {
  return bucketTrendBy(
    points,
    startOfMonth,
    (d) => format(d, "yyyy-MM"),
    (d) => format(d, "MM/yyyy", { locale: vi }),
  );
}

/** Gộp theo quý (Q1–Q4/năm). */
export function bucketTrendByQuarter(points: BaoCaoTrendPoint[]): BaoCaoTrendPoint[] {
  return bucketTrendBy(
    points,
    startOfQuarter,
    (d) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`,
    (d) => `Q${Math.floor(d.getMonth() / 3) + 1}/${d.getFullYear()}`,
  );
}

/** Gộp theo năm. */
export function bucketTrendByYear(points: BaoCaoTrendPoint[]): BaoCaoTrendPoint[] {
  return bucketTrendBy(
    points,
    startOfYear,
    (d) => String(d.getFullYear()),
    (d) => String(d.getFullYear()),
  );
}

export function pickTrend(points: BaoCaoTrendPoint[], granularity: BaoCaoTrendGranularity): BaoCaoTrendPoint[] {
  switch (granularity) {
    case "month":
      return bucketTrendByMonth(points);
    case "quarter":
      return bucketTrendByQuarter(points);
    case "year":
      return bucketTrendByYear(points);
    default:
      return points;
  }
}

export function buildKhoaRank(vst: VstStrategicPayload | null, gsc: GscStrategicPayload | null): BaoCaoKhoaRankRow[] {
  const byId = new Map<string, BaoCaoKhoaRankRow>();
  for (const row of vst?.matrix_khoa ?? []) {
    byId.set(row.id, {
      id: row.id,
      ten: row.ten,
      ty_le_vst: row.ty_le_tuan_thu,
      ty_le_gsc: null,
      ty_le_avg: row.ty_le_tuan_thu,
      tong_co_hoi_vst: row.tong_co_hoi,
      tong_quan_sat_gsc: 0,
    });
  }
  for (const row of gsc?.matrix_khoa ?? []) {
    const cur = byId.get(row.id);
    if (cur) {
      cur.ty_le_gsc = row.ty_le_tuan_thu;
      cur.tong_quan_sat_gsc = row.tong_quan_sat;
      const parts = [cur.ty_le_vst, cur.ty_le_gsc].filter((x): x is number => x != null);
      cur.ty_le_avg = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : null;
    } else {
      byId.set(row.id, {
        id: row.id,
        ten: row.ten,
        ty_le_vst: null,
        ty_le_gsc: row.ty_le_tuan_thu,
        ty_le_avg: row.ty_le_tuan_thu,
        tong_co_hoi_vst: 0,
        tong_quan_sat_gsc: row.tong_quan_sat,
      });
    }
  }
  return [...byId.values()].filter((r) => (r.tong_co_hoi_vst + r.tong_quan_sat_gsc) > 0);
}

export function topBottomKhoa(rows: BaoCaoKhoaRankRow[], n = 5): { top: BaoCaoKhoaRankRow[]; bottom: BaoCaoKhoaRankRow[] } {
  const sorted = [...rows].sort((a, b) => (b.ty_le_avg ?? -1) - (a.ty_le_avg ?? -1));
  const withScore = sorted.filter((r) => r.ty_le_avg != null);
  return {
    top: withScore.slice(0, n),
    bottom: [...withScore].reverse().slice(0, n),
  };
}

/** Gộp matrix_khu_vuc_nhom VST + GSC theo 4 vùng IPAC. */
export function buildIpacZoneCompare(vst: VstStrategicPayload | null, gsc: GscStrategicPayload | null): BaoCaoIpacZoneRow[] {
  const byZone = new Map<string, BaoCaoIpacZoneRow>();

  for (const zone of KHU_VUC_ZONE_ORDER) {
    byZone.set(zone, {
      ma_nhom: zone,
      ten: KHU_VUC_ZONE_LABELS[zone],
      ty_le_vst: null,
      ty_le_gsc: null,
    });
  }

  for (const row of vst?.matrix_khu_vuc_nhom ?? []) {
    const z = String(row.ma_nhom || "").toUpperCase();
    const cur = byZone.get(z);
    if (cur) cur.ty_le_vst = row.ty_le_tuan_thu;
  }
  for (const row of gsc?.matrix_khu_vuc_nhom ?? []) {
    const z = String(row.ma_nhom || "").toUpperCase();
    const cur = byZone.get(z);
    if (cur) cur.ty_le_gsc = row.ty_le_tuan_thu;
  }

  return KHU_VUC_ZONE_ORDER.map((z) => byZone.get(z)!);
}

const SUPERVISION_ANALYTICS_CANONICAL: Record<string, { analytics: string; history: string }> = {
  "/giam-sat-vst": { analytics: "/thong-ke/vst", history: "/lich-su/vst" },
  "/giam-sat-chung": { analytics: "/thong-ke/gsc", history: "/lich-su/gsc" },
};

export function buildAnalyticsDeepLink(
  basePath: string,
  filters: Pick<BaoCaoTongHopFilters, "tu_ngay" | "den_ngay" | "khoa_ids">,
  tab?: string,
): string {
  const q = new URLSearchParams();
  q.set("tu_ngay", filters.tu_ngay);
  q.set("den_ngay", filters.den_ngay);
  if (filters.khoa_ids?.length) q.set("khoa_ids", filters.khoa_ids.join(","));
  const qs = q.toString();

  const canonical = SUPERVISION_ANALYTICS_CANONICAL[basePath];
  if (canonical && tab === "analytics") {
    return qs ? `${canonical.analytics}?${qs}` : canonical.analytics;
  }
  if (canonical && tab === "history") {
    return qs ? `${canonical.history}?${qs}` : canonical.history;
  }

  if (tab) q.set("tab", tab);
  const legacyQs = q.toString();
  return legacyQs ? `${basePath}?${legacyQs}` : basePath;
}

export function shouldFetchSource(chuyenDe: BaoCaoChuyenDe, source: "VST" | "GSC" | "NKBV"): boolean {
  if (chuyenDe === "ALL") return true;
  return chuyenDe === source;
}

export function composeBaoCaoTongHopPayload(args: {
  filters: BaoCaoTongHopFilters;
  vst: VstStrategicPayload | null;
  gsc: GscStrategicPayload | null;
  nkbv: NkbvDashboardPayload | null;
  sources: { vst: SourceLoadStatus; gsc: SourceLoadStatus; nkbv: SourceLoadStatus };
  errors: { vst?: string; gsc?: string; nkbv?: string };
}): BaoCaoTongHopPayload {
  const tyLeVst = computeTyLeVst(args.vst?.kpis);
  const tyLeGsc = computeTyLeGsc(args.gsc?.kpis);
  const { value: tyLeCcs, note: ccsNote } = computeCcs(tyLeVst, tyLeGsc);
  const trendWeek = buildMergedTrend(args.vst, args.gsc);
  const trendMonth = bucketTrendByMonth(trendWeek);
  const khoaRank = buildKhoaRank(args.vst, args.gsc);
  const ipacZoneCompare = buildIpacZoneCompare(args.vst, args.gsc);

  return {
    filters: args.filters,
    sources: args.sources,
    errors: args.errors,
    vst: args.vst,
    gsc: args.gsc,
    nkbv: args.nkbv,
    kpis: {
      ty_le_vst: tyLeVst,
      ty_le_gsc: tyLeGsc,
      ty_le_ccs: tyLeCcs,
      ccs_formula_note: ccsNote,
      ti_le_xac_nhan_nkbv: args.nkbv?.kpis.ti_le_xac_nhan_so_voi_pa ?? null,
      tong_phieu_nkbv: args.nkbv?.kpis.tong_phieu ?? null,
      delta_vst: deltaFromPeriodPoints(trendWeek, "ty_le_vst"),
      delta_gsc: deltaFromPeriodPoints(trendWeek, "ty_le_gsc"),
      delta_ccs: deltaFromPeriodPoints(trendWeek, "ty_le_ccs"),
    },
    trend_week: trendWeek,
    trend_month: trendMonth,
    khoa_rank: khoaRank,
    ipac_zone_compare: ipacZoneCompare,
    capabilities: {
      topic_vst: args.sources.vst === "ok",
      topic_gsc: args.sources.gsc === "ok",
      topic_nkbv: args.sources.nkbv === "ok",
      compare_khoa: khoaRank.length > 0,
      compare_khoi: false,
      compare_khu_vuc:
        (args.vst?.matrix_khu_vuc_nhom?.length ?? 0) > 0 ||
        (args.gsc?.matrix_khu_vuc_nhom?.length ?? 0) > 0,
      compare_doi_tuong: (args.vst?.matrix_nghe?.length ?? 0) > 0,
    },
  };
}
