"use client";

import React, { useMemo } from "react";
import type { GapKhoaRow, GapKhoaSortMetric, GapKhoaSortOrder } from "@/lib/analytics/supervision-matrix-mappers";
import {
  COVERAGE_STATUS_LABELS,
  gapExclusionReason,
  isGapComparable,
  KHOA_COMPLIANCE_WARN_PCT,
  sortGapRowsByMetric,
} from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
  type ComplianceTone,
} from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import type { CSSProperties, ReactElement } from "react";

/** Wrapper SSOT — tránh Recharts width(-1)/height(-1) khi flex/tab chưa layout. */
export function SupervisionResponsiveChart({
  className = "h-full w-full min-w-0",
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactElement;
}) {
  return (
    <Bv103ResponsiveChart className={className} style={style}>
      {children}
    </Bv103ResponsiveChart>
  );
}

/** Chiều cao tối thiểu / tối đa vùng vẽ khoa — vượt max thì cuộn dọc. */
const KHOA_CHART_HEIGHT_MIN = 260;
const KHOA_CHART_HEIGHT_MAX = 720;
/** px mỗi hàng khoa (layout ngang — mã khoa trên trục Y). */
const KHOA_BAR_SLOT_HEIGHT = 26;
const KHOA_Y_AXIS_WIDTH = 56;

function khoaChartPlotHeight(rowCount: number): number {
  if (rowCount <= 0) return KHOA_CHART_HEIGHT_MIN;
  return Math.max(KHOA_CHART_HEIGHT_MIN, rowCount * KHOA_BAR_SLOT_HEIGHT + 56);
}

function KhoaChartViewport({
  rowCount,
  children,
}: {
  rowCount: number;
  children: React.ReactNode;
}) {
  const plotHeight = khoaChartPlotHeight(rowCount);
  const needsScroll = plotHeight > KHOA_CHART_HEIGHT_MAX;
  const viewportHeight = needsScroll ? KHOA_CHART_HEIGHT_MAX : plotHeight;
  return (
    <div
      className={needsScroll ? "overflow-y-auto overscroll-y-contain touch-pan-y" : undefined}
      style={{ height: viewportHeight }}
    >
      <div style={{ height: plotHeight }}>{children}</div>
    </div>
  );
}

const khoaCategoryYAxis = {
  type: "category" as const,
  dataKey: "ten",
  width: KHOA_Y_AXIS_WIDTH,
  tick: { fontSize: 10 },
  interval: 0 as const,
};

export type { CompareRow } from "@/lib/analytics/supervision-analytics.types";

export type MomentRow = {
  ten: string;
  tong_co_hoi: number;
  da_tuan_thu: number;
  ty_le_tuan_thu: number;
};

const momentToneClass: Record<ComplianceTone, string> = {
  green: "text-[var(--surface-success-text)]",
  yellow: "text-[var(--surface-warning-text)]",
  red: "text-[var(--surface-danger-text)]",
  neutral: "text-slate-500",
};

const momentRowBg: Record<ComplianceTone, string> = {
  green: "bg-[var(--surface-success-bg)]/30",
  yellow: "bg-[var(--surface-warning-bg)]/30",
  red: "bg-[var(--surface-danger-bg)]/30",
  neutral: "",
};

function gapPctTone(pct: number | null | undefined): ComplianceTone {
  if (pct == null || Number.isNaN(pct)) return "neutral";
  if (pct >= KHOA_COMPLIANCE_WARN_PCT) return "green";
  return complianceToneFromPercent(pct);
}

function formatGapPctWithDatTong(pct: number | null, dat: number, tong: number): string {
  if (pct == null || tong === 0) return "—";
  return `${formatPercent2(pct)} (${dat.toLocaleString()}/${tong.toLocaleString()})`;
}

function gapCompareStatus(row: GapKhoaRow): { label: string; tone: ComplianceTone } {
  if (isGapComparable(row)) {
    const delta =
      row.ty_le_ksnk != null && row.ty_le_tgs != null
        ? Math.abs(roundPercent2(row.ty_le_ksnk - row.ty_le_tgs))
        : null;
    return {
      label: delta != null ? `Δ ${formatPercent2(delta)}` : COVERAGE_STATUS_LABELS.comparable,
      tone: delta != null && delta >= 20 ? "yellow" : "green",
    };
  }
  const reason = gapExclusionReason(row);
  return {
    label: reason ?? "—",
    tone: reason === "Chưa triển khai" ? "neutral" : "yellow",
  };
}

function useSortedGapRows(
  rows: GapKhoaRow[],
  rankRows: BaoCaoKhoaRankRow[] | undefined,
  sortMetric: GapKhoaSortMetric,
  sortOrder: GapKhoaSortOrder,
) {
  return useMemo(() => {
    if (rankRows?.length) {
      const gapById = new Map(rows.map((r) => [r.id, r]));
      const ordered: GapKhoaRow[] = [];
      for (const rank of rankRows) {
        const gap = gapById.get(rank.id);
        if (gap) ordered.push(gap);
      }
      for (const gap of rows) {
        if (!rankRows.some((r) => r.id === gap.id)) ordered.push(gap);
      }
      return ordered;
    }
    return sortGapRowsByMetric(rows, sortMetric, sortOrder);
  }, [rows, rankRows, sortMetric, sortOrder]);
}

function GapSortToolbar({
  sortOrder,
  onSortOrderChange,
}: {
  sortMetric?: GapKhoaSortMetric;
  sortOrder: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
  moduleLabel?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
      {onSortOrderChange ? (
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          onClick={() => onSortOrderChange(sortOrder === "desc" ? "asc" : "desc")}
        >
          {sortOrder === "desc" ? "Cao → thấp" : "Thấp → cao"}
        </button>
      ) : null}
    </div>
  );
}

function percentTooltipFormatter(value: unknown, name: unknown, item?: { payload?: Record<string, unknown> }) {
  const payload = item?.payload;
  const dat = payload?.dat ?? payload?.ksnk_dat ?? payload?.tgs_dat;
  const tong = payload?.tong ?? payload?.vol_ksnk ?? payload?.vol_tgs;
  const pct = formatPercent2(value);
  if (dat != null && tong != null && Number(tong) > 0) {
    return [`${Number(dat).toLocaleString()}/${Number(tong).toLocaleString()} (${pct})`, String(name ?? "Tuân thủ")];
  }
  return [pct, String(name ?? "Tuân thủ")];
}

/** Chỉ số cột % thấp nhất (mặc định 3) — tô đậm can thiệp. */
function bottomPercentHighlightIndices(values: (number | null | undefined)[], count = 3): Set<number> {
  const ranked = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null && Number.isFinite(x.v));
  ranked.sort((a, b) => a.v - b.v);
  return new Set(ranked.slice(0, count).map((x) => x.i));
}

function highlightBarFill(base: string, highlight: boolean): string {
  return highlight ? "#ef4444" : base;
}

/** Tô cột % dưới ngưỡng cảnh báo (mặc định 80%). */
function complianceBarColor(base: string, pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return base;
  if (pct >= KHOA_COMPLIANCE_WARN_PCT) return base;
  return pct >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN ? "#f59e0b" : "#ef4444";
}

type KhoaBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
};

/** Cột liền — giám sát KSNK. */
function KsnkSolidBarShape({ x = 0, y = 0, width = 0, height = 0, fill = "#38bdf8" }: KhoaBarShapeProps) {
  if (height <= 0) return null;
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />;
}

/** Cột nét đứt — tự giám sát TGS. */
function TgsDashedBarShape({ x = 0, y = 0, width = 0, height = 0, fill = "#fbbf24" }: KhoaBarShapeProps) {
  if (height <= 0) return null;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={0.35}
      stroke={fill}
      strokeWidth={2}
      strokeDasharray="5 3"
      rx={2}
      ry={2}
    />
  );
}

function khoaHorizontalPercentChart(
  data: { label: string; value: number | null; dat?: number; tong?: number; fullName?: string }[],
  barName: string,
  fill: string,
  showThreshold?: boolean,
) {
  const chartData = data.map((d) => ({
    ten: d.label,
    value: d.value,
    dat: d.dat,
    tong: d.tong,
    fullName: d.fullName,
  }));
  const highlights = bottomPercentHighlightIndices(chartData.map((d) => d.value));
  return (
    <SupervisionResponsiveChart className="h-full w-full min-w-0">
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis {...khoaCategoryYAxis} />
        <Tooltip
          formatter={percentTooltipFormatter}
          labelFormatter={(_label, payload) => {
            const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
            return String(row?.fullName ?? _label);
          }}
        />
        {showThreshold ? (
          <ReferenceLine
            x={BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{
              value: `${BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}%`,
              position: "insideTopRight",
              fontSize: 9,
              fill: "#64748b",
            }}
          />
        ) : null}
        <Bar dataKey="value" name={barName} fill={fill} maxBarSize={20}>
          {chartData.map((entry, index) => (
            <Cell key={entry.ten} fill={highlightBarFill(fill, highlights.has(index))} />
          ))}
        </Bar>
      </BarChart>
    </SupervisionResponsiveChart>
  );
}

function SupervisionKhoaPercentBlock({
  title,
  children,
  loading,
  hasData,
  rowCount,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  hasData: boolean;
  rowCount: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <KhoaChartViewport rowCount={rowCount}>
        {!loading && hasData ? (
          children
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </KhoaChartViewport>
    </div>
  );
}

export { percentTooltipFormatter, KhoaChartViewport, khoaCategoryYAxis, KsnkSolidBarShape, TgsDashedBarShape };
export { gapPctTone, gapCompareStatus, formatGapPctWithDatTong, useSortedGapRows, GapSortToolbar };
export { momentToneClass, momentRowBg, khoaHorizontalPercentChart, SupervisionKhoaPercentBlock };
export { bottomPercentHighlightIndices, highlightBarFill, complianceBarColor };
