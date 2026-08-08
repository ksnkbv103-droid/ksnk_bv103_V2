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

/** Chiều cao tối thiểu vùng vẽ khoa — mở rộng theo số hàng; cuộn theo trang (không hộp lồng). */
const KHOA_CHART_HEIGHT_MIN = 260;
/** px mỗi hàng khoa (layout ngang — mã khoa trên trục Y). */
const KHOA_BAR_SLOT_HEIGHT = 26;
const KHOA_Y_AXIS_WIDTH = 72;

function khoaChartPlotHeight(rowCount: number): number {
  if (rowCount <= 0) return KHOA_CHART_HEIGHT_MIN;
  return Math.max(KHOA_CHART_HEIGHT_MIN, rowCount * KHOA_BAR_SLOT_HEIGHT + 56);
}

/** Vùng vẽ biểu đồ khoa — chiều cao theo số hàng; wheel/trackpad cuộn trang như phần còn lại. */
function KhoaChartViewport({
  rowCount,
  children,
}: {
  rowCount: number;
  children: React.ReactNode;
}) {
  const plotHeight = khoaChartPlotHeight(rowCount);
  return (
    <div className="w-full min-w-0" style={{ height: plotHeight }}>
      {children}
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
  sortMetric,
  sortOrder,
  onSortOrderChange,
  onSortMetricChange,
}: {
  sortMetric?: GapKhoaSortMetric;
  sortOrder: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
  onSortMetricChange?: (metric: GapKhoaSortMetric) => void;
  moduleLabel?: string;
}) {
  const metricLabels: Partial<Record<GapKhoaSortMetric, string>> = {
    label: "Mã khoa",
    ty_le_ksnk: "% KSNK",
    ty_le_tgs: "% TGS",
    vol_ksnk: "Vol KSNK",
    vol_tgs: "Vol TGS",
  };

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-slate-500">
        Hiển thị đủ mã khoa trong phạm vi lọc · cảnh báo màu khi tuân thủ &lt;{KHOA_COMPLIANCE_WARN_PCT}%
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onSortMetricChange ? (
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600"
            value={sortMetric ?? "label"}
            onChange={(e) => onSortMetricChange(e.target.value as GapKhoaSortMetric)}
            aria-label="Sắp xếp theo"
          >
            {(Object.keys(metricLabels) as GapKhoaSortMetric[]).map((key) => (
              <option key={key} value={key}>
                {metricLabels[key]}
              </option>
            ))}
          </select>
        ) : null}
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

/** Lề phải đủ chỗ nhãn % + đạt/tổng ngoài cột ngắn. */
const KHOA_BAR_CHART_MARGIN = { left: 4, right: 108, top: 4, bottom: 4 };

const complianceLabelToneFill: Record<ComplianceTone, string> = {
  green: "#047857",
  yellow: "#b45309",
  red: "#dc2626",
  neutral: "#64748b",
};

type KhoaBarLabelPayload = {
  ty_le_tuan_thu?: number | null;
  dat?: number;
  tong?: number;
  dat_ksnk?: number;
  dat_tgs?: number;
  vol_ksnk?: number;
  vol_tgs?: number;
};

type KhoaBarLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string | null;
  payload?: KhoaBarLabelPayload | Record<string, unknown>;
};

function labelCoord(value: number | string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readBarLabelPayload(payload: KhoaBarLabelProps["payload"]): KhoaBarLabelPayload {
  return (payload ?? {}) as KhoaBarLabelPayload;
}

function formatDatTongLabel(dat: number, tong: number): string {
  if (tong <= 0) return "";
  return `${dat.toLocaleString("vi-VN")}/${tong.toLocaleString("vi-VN")}`;
}

/** Nhãn trên cột % tuân thủ — % đậm + đạt/tổng, màu theo ngưỡng. */
function KhoaComplianceBarLabel(rawProps: unknown) {
  const props = rawProps as KhoaBarLabelProps;
  const x = labelCoord(props.x);
  const y = labelCoord(props.y);
  const width = labelCoord(props.width);
  const height = labelCoord(props.height);
  const { value } = props;
  const payload = readBarLabelPayload(props.payload);
  const pctRaw = payload?.ty_le_tuan_thu ?? (typeof value === "number" ? value : null);
  const pct = pctRaw != null && Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : null;
  const dat = Number(payload?.dat ?? 0);
  const tong = Number(payload?.tong ?? 0);
  const centerY = y + height / 2;

  if (pct == null && tong === 0) {
    return (
      <text x={x + 4} y={centerY} dy="0.35em" fontSize={10} fill="#94a3b8" fontWeight={700}>
        —
      </text>
    );
  }

  const pctText = pct != null ? formatPercent2(pct) : "—";
  const ratioText = formatDatTongLabel(dat, tong);
  const tone = gapPctTone(pct);
  const outsideFill = complianceLabelToneFill[tone];
  const inside = width >= 68;

  if (inside) {
    const label = ratioText ? `${pctText} · ${ratioText}` : pctText;
    return (
      <text
        x={x + width - 5}
        y={centerY}
        dy="0.35em"
        textAnchor="end"
        fontSize={10}
        fontWeight={800}
        fill="#ffffff"
        style={{ paintOrder: "stroke", stroke: "rgba(15,23,42,0.4)", strokeWidth: 2.5 }}
      >
        {label}
      </text>
    );
  }

  return (
    <g>
      <text
        x={x + width + 6}
        y={centerY}
        dy={ratioText ? "-0.15em" : "0.35em"}
        textAnchor="start"
        fontSize={11}
        fontWeight={800}
        fill={outsideFill}
      >
        {pctText}
      </text>
      {ratioText ? (
        <text
          x={x + width + 6}
          y={centerY}
          dy="0.95em"
          textAnchor="start"
          fontSize={9}
          fontWeight={700}
          fill="#475569"
        >
          {ratioText}
        </text>
      ) : null}
    </g>
  );
}

/** Nhãn khối lượng trên cột KSNK/TGS — đạt/tổng cơ hội. */
function KhoaVolumeBarLabel(props: KhoaBarLabelProps & { variant: "ksnk" | "tgs" }) {
  const x = labelCoord(props.x);
  const y = labelCoord(props.y);
  const width = labelCoord(props.width);
  const height = labelCoord(props.height);
  const { value, variant } = props;
  const payload = readBarLabelPayload(props.payload);
  const vol =
    variant === "ksnk"
      ? Number(payload?.vol_ksnk ?? value ?? 0)
      : Number(payload?.vol_tgs ?? value ?? 0);
  const dat = variant === "ksnk" ? Number(payload?.dat_ksnk ?? 0) : Number(payload?.dat_tgs ?? 0);
  if (vol <= 0) return null;

  const text = formatDatTongLabel(dat, vol);
  const centerY = y + height / 2;
  const inside = width >= 40;
  const outsideFill = variant === "ksnk" ? "#0369a1" : "#b45309";
  const insideFill = variant === "ksnk" ? "#ffffff" : "#78350f";

  if (inside) {
    return (
      <text
        x={x + width / 2}
        y={centerY}
        dy="0.35em"
        textAnchor="middle"
        fontSize={9}
        fontWeight={800}
        fill={insideFill}
        style={
          variant === "ksnk"
            ? { paintOrder: "stroke", stroke: "rgba(3,105,161,0.45)", strokeWidth: 2 }
            : undefined
        }
      >
        {text}
      </text>
    );
  }

  return (
    <text
      x={x + width + 4}
      y={centerY}
      dy="0.35em"
      textAnchor="start"
      fontSize={9}
      fontWeight={800}
      fill={outsideFill}
    >
      {text}
    </text>
  );
}

function khoaVolumeBarLabelContent(variant: "ksnk" | "tgs") {
  return function KhoaVolumeBarLabelContent(rawProps: unknown) {
    return <KhoaVolumeBarLabel {...(rawProps as KhoaBarLabelProps)} variant={variant} />;
  };
}


export { percentTooltipFormatter, KhoaChartViewport, khoaCategoryYAxis, KsnkSolidBarShape, TgsDashedBarShape };
export {
  gapPctTone,
  gapCompareStatus,
  formatGapPctWithDatTong,
  useSortedGapRows,
  KHOA_BAR_CHART_MARGIN,
  KhoaComplianceBarLabel,
  khoaVolumeBarLabelContent,
};
export { momentToneClass, momentRowBg };
export { complianceBarColor };
