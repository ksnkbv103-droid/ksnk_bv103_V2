import { addWeeks, format, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from "date-fns";
import { vi } from "date-fns/locale";
import { khoaChartLabel } from "@/lib/analytics/supervision-matrix-mappers";
import {
  computeTyLeGsc,
  computeTyLeVst,
  rateFromTotals,
} from "@/lib/analytics/supervision-metrics";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { NkbvDashboardPayload } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";
import type {
  BaoCaoChuyenDe,
  BaoCaoCssdAppendix,
  BaoCaoKhoaRankRow,
  BaoCaoTrendGranularity,
  BaoCaoTrendPoint,
  BaoCaoTongHopFilters,
  BaoCaoTongHopPayload,
  SourceLoadStatus,
} from "../types/bao-cao-tong-hop.types";

export {
  computeCcs,
  computeTyLeVst,
  computeTyLeGsc,
  deltaFromTrend,
} from "@/lib/analytics/supervision-metrics";

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
  return {
    label: row.label,
    min_date: row.min_date,
    ty_le_vst,
    ty_le_gsc,
    vst_tong: row.vst_tong > 0 ? row.vst_tong : null,
    vst_dat: row.vst_tong > 0 ? row.vst_dat : null,
    gsc_tong: row.gsc_tong > 0 ? row.gsc_tong : null,
    gsc_dat: row.gsc_tong > 0 ? row.gsc_dat : null,
  };
}

type TrendSlice = {
  label: string;
  min_date: string;
  ty_le: number;
  tong: number;
  dat: number;
};

/** Khóa tuần ISO (Thứ 2) — tránh tách VST/GSC cùng tuần thành 2 điểm vì min_date khác ngày. */
function isoWeekBucketKey(minDate: string): string {
  const start = startOfWeek(parseISO(`${minDate}T12:00:00`), { weekStartsOn: 1 });
  return format(start, "yyyy-MM-dd");
}

function pointHasMetricVolume(p: BaoCaoTrendPoint, metric: "ty_le_vst" | "ty_le_gsc"): boolean {
  if (metric === "ty_le_vst") return (p.vst_tong ?? 0) > 0 && p.ty_le_vst != null;
  return (p.gsc_tong ?? 0) > 0 && p.ty_le_gsc != null;
}

/** So sánh tuần cuối vs tuần liền trước — chỉ khi đủ 2 tuần ISO liên tiếp có dữ liệu. */
export function deltaFromPeriodPoints(
  points: BaoCaoTrendPoint[],
  metric: "ty_le_vst" | "ty_le_gsc",
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

function finalizeKhoaRankRow(row: Omit<BaoCaoKhoaRankRow, "has_data">): BaoCaoKhoaRankRow {
  const parts = [row.ty_le_vst, row.ty_le_gsc].filter((x): x is number => x != null);
  const ty_le_avg = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : null;
  return { ...row, ty_le_avg, has_data: true };
}

export function buildKhoaRank(vst: VstStrategicPayload | null, gsc: GscStrategicPayload | null): BaoCaoKhoaRankRow[] {
  const byId = new Map<string, BaoCaoKhoaRankRow>();
  for (const row of vst?.matrix_khoa ?? []) {
    byId.set(
      row.id,
      finalizeKhoaRankRow({
        id: row.id,
        ten: row.ten,
        label: khoaChartLabel(row),
        ty_le_vst: row.ty_le_tuan_thu,
        ty_le_gsc: null,
        ty_le_avg: row.ty_le_tuan_thu,
        tong_co_hoi_vst: row.tong_co_hoi,
        tong_quan_sat_gsc: 0,
      }),
    );
  }
  for (const row of gsc?.matrix_khoa ?? []) {
    const cur = byId.get(row.id);
    if (cur) {
      cur.ty_le_gsc = row.ty_le_tuan_thu;
      cur.tong_quan_sat_gsc = row.tong_quan_sat;
      const finalized = finalizeKhoaRankRow(cur);
      cur.ty_le_avg = finalized.ty_le_avg;
    } else {
      byId.set(
        row.id,
        finalizeKhoaRankRow({
          id: row.id,
          ten: row.ten,
          label: khoaChartLabel(row),
          ty_le_vst: null,
          ty_le_gsc: row.ty_le_tuan_thu,
          ty_le_avg: row.ty_le_tuan_thu,
          tong_co_hoi_vst: 0,
          tong_quan_sat_gsc: row.tong_quan_sat,
        }),
      );
    }
  }
  return [...byId.values()].filter((r) => (r.tong_co_hoi_vst + r.tong_quan_sat_gsc) > 0);
}

export type KhoaOptionLike = { id: string; label: string };

function khoaRankHasVolume(row: BaoCaoKhoaRankRow): boolean {
  return row.has_data !== false && row.tong_co_hoi_vst + row.tong_quan_sat_gsc > 0;
}

/**
 * Xếp hạng can thiệp: ưu tiên khoa có dữ liệu, sắp **GSC tăng dần** (thấp → cao),
 * rồi VST tăng dần. Không xếp theo CCS.
 */
export function sortKhoaRankByComplianceAsc(rows: BaoCaoKhoaRankRow[]): BaoCaoKhoaRankRow[] {
  return [...rows].sort((a, b) => {
    const aVol = khoaRankHasVolume(a);
    const bVol = khoaRankHasVolume(b);
    if (aVol && !bVol) return -1;
    if (!aVol && bVol) return 1;
    const aGsc = a.ty_le_gsc;
    const bGsc = b.ty_le_gsc;
    if (aGsc != null && bGsc != null && aGsc !== bGsc) return aGsc - bGsc;
    if (aGsc != null && bGsc == null) return -1;
    if (aGsc == null && bGsc != null) return 1;
    const aVst = a.ty_le_vst ?? 999;
    const bVst = b.ty_le_vst ?? 999;
    return aVst - bVst;
  });
}

/** Gộp khoa đã chọn (lọc) với dữ liệu RPC — khoa 0 phiên vẫn hiện «Chưa GS». */
export function mergeKhoaRankWithSelected(
  rows: BaoCaoKhoaRankRow[],
  selectedKhoaIds: string[] | undefined,
  khoaOptions: KhoaOptionLike[],
  khoaOptionCount: number,
): BaoCaoKhoaRankRow[] {
  const byId = new Map(rows.map((r) => [r.id, { ...r, has_data: r.has_data ?? true }]));
  const isFiltered = Boolean(selectedKhoaIds?.length && selectedKhoaIds.length < khoaOptionCount);

  if (!isFiltered) {
    return sortKhoaRankByComplianceAsc([...byId.values()]);
  }

  const merged: BaoCaoKhoaRankRow[] = [];
  for (const id of selectedKhoaIds ?? []) {
    const existing = byId.get(id);
    if (existing) {
      merged.push(existing);
      continue;
    }
    const opt = khoaOptions.find((o) => o.id === id);
    const ten = opt?.label ?? id;
    const maMatch = ten.match(/^\[([^\]]+)\]/);
    merged.push({
      id,
      ten,
      label: maMatch?.[1] ?? (ten.length > 12 ? `${ten.slice(0, 10)}…` : ten),
      ty_le_vst: null,
      ty_le_gsc: null,
      ty_le_avg: null,
      tong_co_hoi_vst: 0,
      tong_quan_sat_gsc: 0,
      has_data: false,
    });
  }
  return sortKhoaRankByComplianceAsc(merged);
}

export function topBottomKhoa(rows: BaoCaoKhoaRankRow[], n = 5): { top: BaoCaoKhoaRankRow[]; bottom: BaoCaoKhoaRankRow[] } {
  const sorted = [...rows].sort((a, b) => (b.ty_le_avg ?? -1) - (a.ty_le_avg ?? -1));
  const withScore = sorted.filter((r) => r.ty_le_avg != null);
  return {
    top: withScore.slice(0, n),
    bottom: [...withScore].reverse().slice(0, n),
  };
}


const SUPERVISION_ANALYTICS_CANONICAL: Record<string, { analytics: string; history: string }> = {
  "/giam-sat-vst": { analytics: "/thong-ke/vst", history: "/lich-su/vst" },
  "/giam-sat-chung": { analytics: "/thong-ke/gsc", history: "/lich-su/gsc" },
  "/thong-ke/vst": { analytics: "/thong-ke/vst", history: "/lich-su/vst" },
  "/thong-ke/gsc": { analytics: "/thong-ke/gsc", history: "/lich-su/gsc" },
};

export type AnalyticsDeepLinkFilters = Pick<BaoCaoTongHopFilters, "tu_ngay" | "den_ngay" | "khoa_ids"> & {
  /** Tab view trên `/thong-ke/gsc` — ví dụ `bk-toi`. */
  view?: string;
};

export function buildAnalyticsDeepLink(
  basePath: string,
  filters: AnalyticsDeepLinkFilters,
  tab?: string,
): string {
  const q = new URLSearchParams();
  q.set("tu_ngay", filters.tu_ngay);
  q.set("den_ngay", filters.den_ngay);
  if (filters.khoa_ids?.length) q.set("khoa_ids", filters.khoa_ids.join(","));
  if (filters.view) q.set("view", filters.view);
  const qs = q.toString();

  const canonical = SUPERVISION_ANALYTICS_CANONICAL[basePath];
  if (canonical && tab === "analytics") {
    return qs ? `${canonical.analytics}?${qs}` : canonical.analytics;
  }
  if (canonical && tab === "history") {
    return qs ? `${canonical.history}?${qs}` : canonical.history;
  }
  if (canonical && !tab && (basePath === "/thong-ke/vst" || basePath === "/thong-ke/gsc")) {
    return qs ? `${canonical.analytics}?${qs}` : canonical.analytics;
  }

  if (tab) q.set("tab", tab);
  const legacyQs = q.toString();
  return legacyQs ? `${basePath}?${legacyQs}` : basePath;
}

/** `2026-06-01` → `01/06/2026` — dùng trên bìa báo cáo in. */
export function formatBaoCaoIsoDateVi(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/** Dòng ngày ban hành chuẩn văn bản (Hà Nội, ngày …). */
export function formatBaoCaoIssueDateVi(date: Date): string {
  return `Hà Nội, ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`;
}

/** Mã số báo cáo tổng hợp theo kỳ lọc. */
export function buildBaoCaoReportNo(tuNgay: string, denNgay: string): string {
  return `BC-TH-${tuNgay.replaceAll("-", "")}-${denNgay.replaceAll("-", "")}`;
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
  cssd?: BaoCaoCssdAppendix | null;
  sources: { vst: SourceLoadStatus; gsc: SourceLoadStatus; nkbv: SourceLoadStatus; cssd?: SourceLoadStatus };
  errors: { vst?: string; gsc?: string; nkbv?: string; cssd?: string };
  /** Kỳ trước cùng độ dài — chỉ số process; null nếu không tải. */
  kyTruoc?: {
    tu_ngay: string;
    den_ngay: string;
    ty_le_vst: number | null;
    ty_le_gsc: number | null;
  } | null;
}): BaoCaoTongHopPayload {
  const tyLeVst = computeTyLeVst(args.vst?.kpis);
  const tyLeGsc = computeTyLeGsc(args.gsc?.kpis);
  const trendWeek = buildMergedTrend(args.vst, args.gsc);
  const trendMonth = bucketTrendByMonth(trendWeek);
  const khoaRank = buildKhoaRank(args.vst, args.gsc);
  const cssdStatus = args.sources.cssd ?? "skipped";

  const kyTruocBase = args.kyTruoc ?? null;
  const ky_truoc = kyTruocBase
    ? {
        ...kyTruocBase,
        delta_vst:
          tyLeVst != null && kyTruocBase.ty_le_vst != null
            ? Math.round((tyLeVst - kyTruocBase.ty_le_vst) * 10) / 10
            : null,
        delta_gsc:
          tyLeGsc != null && kyTruocBase.ty_le_gsc != null
            ? Math.round((tyLeGsc - kyTruocBase.ty_le_gsc) * 10) / 10
            : null,
      }
    : null;

  return {
    filters: args.filters,
    sources: {
      vst: args.sources.vst,
      gsc: args.sources.gsc,
      nkbv: args.sources.nkbv,
      cssd: cssdStatus,
    },
    errors: args.errors,
    vst: args.vst,
    gsc: args.gsc,
    nkbv: args.nkbv,
    cssd: args.cssd ?? null,
    kpis: {
      ty_le_vst: tyLeVst,
      ty_le_gsc: tyLeGsc,
      ti_le_xac_nhan_nkbv: args.nkbv?.kpis.ti_le_xac_nhan_so_voi_pa ?? null,
      tong_phieu_nkbv: args.nkbv?.kpis.tong_phieu ?? null,
      delta_vst: deltaFromPeriodPoints(trendWeek, "ty_le_vst"),
      delta_gsc: deltaFromPeriodPoints(trendWeek, "ty_le_gsc"),
    },
    ky_truoc,
    trend_week: trendWeek,
    trend_month: trendMonth,
    khoa_rank: khoaRank,
    capabilities: {
      topic_vst: args.sources.vst === "ok",
      topic_gsc: args.sources.gsc === "ok",
      topic_nkbv: args.sources.nkbv === "ok",
      topic_cssd: cssdStatus === "ok",
      compare_khoa: khoaRank.length > 0 || (args.filters.khoa_ids?.length ?? 0) > 0,
      compare_khoi:
        (args.vst?.matrix_khoi?.length ?? 0) > 0 || (args.gsc?.matrix_khoi?.length ?? 0) > 0,
      compare_khu_vuc:
        (args.vst?.matrix_khu_vuc?.length ?? 0) > 0 ||
        (args.gsc?.matrix_khu_vuc?.length ?? 0) > 0,
      compare_doi_tuong:
        (args.vst?.matrix_nghe?.length ?? 0) > 0 || (args.gsc?.matrix_nghe?.length ?? 0) > 0,
    },
  };
}
