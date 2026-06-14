"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CoverageTopicInput, GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";
import {
  buildCoverageMatrix,
  COVERAGE_STATUS_LABELS,
  countKhoaMissingTgs,
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  coverageCellStatus,
  findGapRowByKhoaId,
  gapExclusionReason,
  isGapComparable,
  khoaChartLabel,
  partitionGapKhoaRows,
  type CoverageCellStatus,
} from "@/lib/analytics/supervision-matrix-mappers";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
  type ComplianceTone,
} from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import type { BangKiemApDungSource, KhoaApDungContext } from "@/lib/domain/bang-kiem-ap-dung";
import {
  buildObligationMatrixCells,
  buildTgsCoverageRanking,
  buildTgsHitSet,
  listObligationMatrixColumns,
  TGS_OBLIGATION_LABELS,
  type TgsCoverageKhoaRow,
  type TgsObligationCellStatus,
} from "@/lib/analytics/tgs-coverage-mappers";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";

const KHOA_CHART_HEIGHT = 260;
const KHOA_XAXIS_HEIGHT = 56;

import type { CompareRow } from "@/lib/analytics/supervision-analytics.types";
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

function percentTooltipFormatter(value: unknown, name: unknown) {
  return [formatPercent2(value), String(name ?? "Tuân thủ")];
}

function mapTrendRows<T extends { ty_le_tuan_thu?: number }>(data: T[]): T[] {
  return data.map((row) => ({ ...row, ty_le_tuan_thu: roundPercent2(row.ty_le_tuan_thu) }));
}

export function SupervisionKpiRow({
  items,
  loading,
}: {
  loading?: boolean;
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{k.label}</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{loading ? "…" : k.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SupervisionTrendChart({
  title,
  data,
  loading,
  dataKey = "ty_le_tuan_thu",
  stroke = "#38bdf8",
}: {
  title: string;
  data: { label: string; ty_le_tuan_thu: number }[];
  loading?: boolean;
  dataKey?: string;
  stroke?: string;
}) {
  const chartData = mapTrendRows(data);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div className="h-[240px]">
        {!loading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={percentTooltipFormatter} />
              <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} name="Tuân thủ (%)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </div>
    </div>
  );
}

export function SupervisionCompareBarChart({
  title,
  rows,
  loading,
  layout = "vertical",
}: {
  title: string;
  rows: CompareRow[];
  loading?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  const data = rows.filter((r) => r.ten);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div className={layout === "vertical" ? "h-[220px]" : "h-[200px]"}>
        {!loading && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {layout === "vertical" ? (
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="ten" width={88} tick={{ fontSize: 9 }} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={56} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#38bdf8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </div>
    </div>
  );
}

function khoaVerticalPercentChart(
  data: { label: string; value: number | null }[],
  barName: string,
  fill: string,
  showThreshold?: boolean,
) {
  const chartData = data.map((d) => ({ ten: d.label, value: d.value }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={KHOA_XAXIS_HEIGHT} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value: unknown) => {
            if (value == null || value === "") return ["—", barName];
            return [formatPercent2(value), barName];
          }}
        />
        {showThreshold ? (
          <ReferenceLine
            y={BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}
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
        <Bar dataKey="value" name={barName} fill={fill} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SupervisionKhoaPercentBlock({
  title,
  children,
  loading,
  hasData,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  hasData: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div style={{ height: KHOA_CHART_HEIGHT }}>
        {!loading && hasData ? (
          children
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </div>
    </div>
  );
}

/** Ba biểu đồ cột dọc theo khoa: KSNK · Tự GS · Đối soát — đặt ngay dưới xu hướng. */
export function SupervisionKhoaTriptych({
  rows,
  loading,
  moduleLabel,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
}) {
  if (!loading && rows.length === 0) return null;

  const prefix = moduleLabel ? `${moduleLabel} · ` : "";
  const gapData = rows
    .filter((r) => isGapComparable(r))
    .map((r) => ({
      ten: r.label,
      ty_le_tgs: r.ty_le_tgs,
      ty_le_ksnk: r.ty_le_ksnk,
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <h3 className="text-sm font-bold text-slate-800">Tuân thủ theo khoa</h3>
        <p className="text-[11px] text-slate-500">
          {prefix}Cột dọc theo mã khoa — tách nguồn KSNK, Tự GS và đối soát song song.
        </p>
      </div>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Giám sát KSNK (theo khoa)`}
        loading={loading}
        hasData={rows.some((r) => r.ty_le_ksnk != null)}
      >
        {khoaVerticalPercentChart(
          rows.map((r) => ({ label: r.label, value: r.ty_le_ksnk })),
          "KSNK (%)",
          "#38bdf8",
          true,
        )}
      </SupervisionKhoaPercentBlock>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Khoa tự giám sát (theo khoa)`}
        loading={loading}
        hasData={rows.some((r) => r.ty_le_tgs != null)}
      >
        {khoaVerticalPercentChart(
          rows.map((r) => ({ label: r.label, value: r.ty_le_tgs })),
          "Tự GS (%)",
          "#fbbf24",
          true,
        )}
      </SupervisionKhoaPercentBlock>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Đối soát Tự giám sát vs KSNK (theo khoa)`}
        loading={loading}
        hasData={gapData.length > 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={gapData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={KHOA_XAXIS_HEIGHT} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip formatter={percentTooltipFormatter} />
            <Legend />
            <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" maxBarSize={20} />
            <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#38bdf8" maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </SupervisionKhoaPercentBlock>
      {!loading && gapData.length === 0 && rows.some((r) => gapExclusionReason(r)) ? (
        <p className="px-1 text-[11px] text-slate-500">
          Không có khoa đủ hai nguồn TGS và KSNK trong kỳ — xem bảng «Chưa đủ điều kiện đối soát» bên dưới.
        </p>
      ) : null}
    </div>
  );
}

/** Khối lượng tự giám sát theo khoa — song song triển khai KSNK. */
export function SupervisionTgsDeploymentChart({
  rows,
  loading,
  volumeLabel = "Cơ hội TGS",
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  volumeLabel?: string;
}) {
  if (!loading && rows.length === 0) return null;

  const { covered, total } = countTgsCoveredKhoa(rows);
  const chartData = rows.map((r) => ({
    ten: r.label,
    vol_tgs: r.vol_tgs,
    fullName: r.ten,
    covered: r.vol_tgs > 0,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Triển khai tự giám sát theo khoa</h3>
        <p className="text-[11px] font-medium text-slate-600">
          {loading ? "…" : (
            <>
              <span className="font-bold text-amber-700">{covered}</span>/{total} khoa có TGS trong kỳ
            </>
          )}
        </p>
      </div>
      <div style={{ height: KHOA_CHART_HEIGHT }}>
        {!loading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={KHOA_XAXIS_HEIGHT} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: unknown) => {
                  const vol = Number(value ?? 0);
                  const status = vol > 0 ? "Đã có TGS" : "Chưa có TGS";
                  return [`${vol.toLocaleString()} · ${status}`, volumeLabel];
                }}
                labelFormatter={(_label, payload) => {
                  const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
                  return String(row?.fullName ?? _label);
                }}
              />
              <Bar dataKey="vol_tgs" name={volumeLabel} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.ten} fill={entry.covered ? "#fbbf24" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Cột vàng = khoa đã có tự giám sát; cột xám = chưa có hoạt động TGS trong phạm vi lọc.
      </p>
    </div>
  );
}

/** Khối lượng giám sát KSNK theo khoa — đánh giá triển khai tại khoa lâm sàng. */
export function SupervisionKsnkDeploymentChart({
  rows,
  loading,
  volumeLabel = "Cơ hội KSNK",
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  volumeLabel?: string;
}) {
  if (!loading && rows.length === 0) return null;

  const { covered, total } = countKsnkCoveredKhoa(rows);
  const chartData = rows.map((r) => ({
    ten: r.label,
    vol_ksnk: r.vol_ksnk,
    fullName: r.ten,
    covered: r.vol_ksnk > 0,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Triển khai giám sát KSNK theo khoa</h3>
        <p className="text-[11px] font-medium text-slate-600">
          {loading ? "…" : (
            <>
              <span className="font-bold text-sky-700">{covered}</span>/{total} khoa đã có phiên KSNK trong kỳ
            </>
          )}
        </p>
      </div>
      <div style={{ height: KHOA_CHART_HEIGHT }}>
        {!loading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={KHOA_XAXIS_HEIGHT} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value: unknown, _name: unknown, item: { payload?: { fullName?: string; covered?: boolean } }) => {
                  const vol = Number(value ?? 0);
                  const status = vol > 0 ? "Đã có GS KSNK" : "Chưa có GS KSNK";
                  return [`${vol.toLocaleString()} · ${status}`, volumeLabel];
                }}
                labelFormatter={(_label, payload) => {
                  const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
                  return String(row?.fullName ?? _label);
                }}
              />
              <Bar dataKey="vol_ksnk" name={volumeLabel} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.ten} fill={entry.covered ? "#38bdf8" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Cột xanh = khoa đã có giám sát KSNK; cột xám = chưa có hoạt động KSNK trong phạm vi lọc.
      </p>
    </div>
  );
}

/** Khoa chưa đủ điều kiện đối soát TGS vs KSNK — số cố định trên bảng. */
export function SupervisionGapExclusionTable({
  rows,
  loading,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
}) {
  const excluded = rows.filter((r) => gapExclusionReason(r) != null);
  if (!loading && excluded.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">Chưa đủ điều kiện đối soát</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Chỉ khoa có cả TGS và KSNK trong kỳ mới xuất hiện biểu đồ đối soát.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-amber-200/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2">TGS</th>
              <th className="px-2 py-2">KSNK</th>
              <th className="px-2 py-2">Lý do</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              excluded.map((r) => {
                const reason = gapExclusionReason(r);
                return (
                <tr key={r.id} className="border-b border-amber-100/80">
                  <td className="px-2 py-2 font-medium text-slate-800">{r.ten}</td>
                  <td className="px-2 py-2 tabular-nums">{r.vol_tgs.toLocaleString()}</td>
                  <td className="px-2 py-2 tabular-nums">{r.vol_ksnk.toLocaleString()}</td>
                  <td className="px-2 py-2 text-amber-800">{reason}</td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const coverageCellClass: Record<CoverageCellStatus, string> = {
  none: "bg-slate-100 text-slate-600",
  tgs_only: "bg-amber-50 text-amber-900",
  ksnk_only: "bg-sky-50 text-sky-900",
  comparable: "bg-emerald-50 text-emerald-900",
};

/** Ma trận bao phủ khoa × chuyên đề (VST 1 cột · GSC nhiều BK). */
export function SupervisionCoverageMatrix({
  topics,
  loading,
  maxColumns,
}: {
  topics: CoverageTopicInput[];
  loading?: boolean;
  maxColumns?: number;
}) {
  if (!loading && topics.length === 0) return null;

  const limitedTopics = maxColumns != null ? topics.slice(0, maxColumns) : topics;
  const { khoaRows, topicLabels } = buildCoverageMatrix(limitedTopics);

  if (!loading && khoaRows.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Ma trận bao phủ TGS / KSNK theo khoa</h3>
        {maxColumns != null && topics.length > maxColumns ? (
          <p className="text-[11px] text-slate-500">Hiển thị {maxColumns}/{topics.length} chuyên đề (web: đầy đủ).</p>
        ) : null}
      </div>
      {limitedTopics.map((topic) => {
        const missing = countKhoaMissingTgs(topic.rows);
        if (missing === 0) return null;
        return (
          <p key={topic.id} className="mb-2 text-[11px] font-medium text-amber-800">
            {missing} khoa chưa tự GS chuyên đề «{topic.label}» trong kỳ
          </p>
        );
      })}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 z-10 bg-white px-2 py-2">Khoa</th>
              {topicLabels.map((t) => (
                <th key={t.id} className="min-w-[72px] px-2 py-2 text-center">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={topicLabels.length + 1} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              khoaRows.map((khoa) => (
                <tr key={khoa.id} className="border-b border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-medium text-slate-800">{khoa.label}</td>
                  {limitedTopics.map((topic) => {
                    const cell = coverageCellStatus(findGapRowByKhoaId(topic.rows, khoa.id));
                    const label = COVERAGE_STATUS_LABELS[cell];
                    return (
                      <td key={topic.id} className="px-1 py-1 text-center">
                        <span
                          className={`inline-block min-w-[4.5rem] rounded px-1 py-0.5 text-[10px] font-semibold ${coverageCellClass[cell]}`}
                        >
                          {label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Trend → triptych → triển khai TGS/KSNK → loại trừ → (tuỳ chọn) ma trận bao phủ. */
export function SupervisionKhoaAnalyticsBlock({
  rows,
  loading,
  moduleLabel,
  tgsVolumeLabel,
  ksnkVolumeLabel,
  coverageTopics,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  tgsVolumeLabel?: string;
  ksnkVolumeLabel?: string;
  coverageTopics?: CoverageTopicInput[];
}) {
  const { excluded } = useMemo(() => partitionGapKhoaRows(rows), [rows]);

  if (!loading && rows.length === 0 && !coverageTopics?.length) return null;

  return (
    <div className="space-y-4">
      <SupervisionKhoaTriptych rows={rows} loading={loading} moduleLabel={moduleLabel} />
      <SupervisionTgsDeploymentChart rows={rows} loading={loading} volumeLabel={tgsVolumeLabel} />
      <SupervisionKsnkDeploymentChart rows={rows} loading={loading} volumeLabel={ksnkVolumeLabel} />
      <SupervisionGapExclusionTable rows={excluded} loading={loading} />
      {coverageTopics && coverageTopics.length > 0 ? (
        <SupervisionCoverageMatrix topics={coverageTopics} loading={loading} />
      ) : null}
    </div>
  );
}

/** @deprecated Dùng SupervisionKhoaTriptych */
export function SupervisionGapChart({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: { ten: string; ty_le_tgs: number | null; ty_le_ksnk: number | null }[];
  loading?: boolean;
}) {
  const data = rows.filter((r) => r.ty_le_tgs != null || r.ty_le_ksnk != null);
  if (!loading && data.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div style={{ height: KHOA_CHART_HEIGHT }}>
        {!loading && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={KHOA_XAXIS_HEIGHT} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={percentTooltipFormatter} />
              <Legend />
              <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" />
              <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#38bdf8" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</p>
        )}
      </div>
    </div>
  );
}

/** Radar 5 moment WHO + bảng số luôn hiện (không phụ thuộc hover) — dùng khi báo cáo VST. */
export function SupervisionMomentsPanel({
  title = "5 thời điểm WHO",
  moments,
  loading,
  stroke = "#10b981",
}: {
  title?: string;
  moments: MomentRow[];
  loading?: boolean;
  stroke?: string;
}) {
  const rows = moments.map((m) => ({
    ...m,
    ty_le_tuan_thu: roundPercent2(m.ty_le_tuan_thu),
  }));

  if (!loading && rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-[240px] min-h-[200px]">
          {!loading && rows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={rows}>
                <PolarGrid />
                <PolarAngleAxis dataKey="ten" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Radar
                  name="Tuân thủ %"
                  dataKey="ty_le_tuan_thu"
                  stroke={stroke}
                  fill={stroke}
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              {loading ? "Đang tải…" : "Chưa có dữ liệu"}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center">
          {!loading && rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 text-left">Thời điểm</th>
                    <th className="px-3 py-2 text-right">Cơ hội</th>
                    <th className="px-3 py-2 text-right">Tuân thủ</th>
                    <th className="px-3 py-2 text-right">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const tone = complianceToneFromPercent(m.ty_le_tuan_thu);
                    return (
                      <tr key={m.ten} className={`border-b border-slate-100 last:border-0 ${momentRowBg[tone]}`}>
                        <td className="px-3 py-2 text-left text-xs font-medium text-slate-800">{m.ten}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                          {m.tong_co_hoi.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                          {m.da_tuan_thu.toLocaleString()}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${momentToneClass[tone]}`}>
                          {formatPercent2(m.ty_le_tuan_thu)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{loading ? "Đang tải…" : "Chưa có dữ liệu"}</p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Số liệu hiển thị cố định — phù hợp trình bày và in màn hình; radar thể hiện chênh lệch giữa các moment.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SupervisionCompareGrid({
  sections,
  loading,
}: {
  loading?: boolean;
  sections: { title: string; rows: CompareRow[] }[];
}) {
  const visible = sections.filter((s) => loading || s.rows.length > 0);
  if (!loading && visible.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {visible.map((s) => (
        <SupervisionCompareBarChart key={s.title} title={s.title} rows={s.rows} loading={loading} />
      ))}
    </div>
  );
}

/** Accordion cho IPAC · nghề · hình thức — tránh trùng visual với block khoa. */
export function SupervisionCompareAccordion({
  sections,
  loading,
  summaryLabel = "Chi tiết: IPAC · nghề · hình thức",
}: {
  loading?: boolean;
  sections: { title: string; rows: CompareRow[] }[];
  summaryLabel?: string;
}) {
  const visible = sections.filter((s) => loading || s.rows.length > 0);
  if (!loading && visible.length === 0) return null;

  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          {summaryLabel}
          <span className="text-[11px] font-normal text-slate-500">({visible.length} nhóm)</span>
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">
        <SupervisionCompareGrid sections={visible} loading={loading} />
      </div>
    </details>
  );
}

const obligationCellClass: Record<TgsObligationCellStatus, string> = {
  not_applicable: "bg-slate-50 text-slate-400",
  missing_tgs: "bg-red-50 text-red-900",
  has_tgs: "bg-emerald-50 text-emerald-900",
};

export function SupervisionTgsCoverageRankingTable({
  rows,
  loading,
  maxRows = 15,
}: {
  rows: TgsCoverageKhoaRow[];
  loading?: boolean;
  maxRows?: number;
}) {
  const slice = rows.slice(0, maxRows);
  if (!loading && slice.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">Xếp hạng triển khai TGS (bao phủ BK bắt buộc)</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Bao phủ = số loại BK đã có ≥1 phiên TGS ÷ số BK bắt buộc với khoa (không cộng số phiên).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">Bao phủ</th>
              <th className="px-2 py-2 text-center">Thiếu</th>
              <th className="px-2 py-2 text-center">Tuân thủ TGS</th>
              <th className="px-2 py-2 text-left">BK thiếu (mã)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              slice.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-800">{r.ten}</td>
                  <td className="px-2 py-2 text-center tabular-nums font-semibold">
                    {formatPercent2(r.ty_le_bao_phu_tgs)} ({r.so_bk_da_tgs}/{r.so_bk_bat_buoc})
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums text-red-700">{r.so_bk_thieu}</td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {r.ty_le_tuan_thu_tgs != null ? formatPercent2(r.ty_le_tuan_thu_tgs) : "—"}
                  </td>
                  <td className="px-2 py-2 text-[10px] text-slate-600">
                    {r.bk_thieu_labels.length > 0 ? r.bk_thieu_labels.slice(0, 6).join(", ") : "—"}
                    {r.bk_thieu_labels.length > 6 ? "…" : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SupervisionObligationMatrix({
  catalog,
  khoaList,
  hitSet,
  loading,
  maxColumns = 12,
}: {
  catalog: BangKiemApDungSource[];
  khoaList: KhoaApDungContext[];
  hitSet: Set<string>;
  loading?: boolean;
  maxColumns?: number;
}) {
  const columns = listObligationMatrixColumns(catalog).slice(0, maxColumns);
  const cells = buildObligationMatrixCells(khoaList, catalog, columns, hitSet);
  const cellMap = new Map(cells.map((c) => [`${c.khoaId}|${c.bkId}`, c.status]));

  if (!loading && columns.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">Ma trận nghĩa vụ TGS (khoa × bảng kiểm)</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        «Không áp dụng» = khoa không thuộc phạm vi BK · «Thiếu TGS» = bắt buộc nhưng chưa có phiên trong kỳ.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 z-10 bg-white px-2 py-2">Khoa</th>
              {columns.map((c) => (
                <th key={c.id} className="min-w-[56px] px-1 py-2 text-center" title={c.label}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              khoaList.map((khoa) => (
                <tr key={khoa.id} className="border-b border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-medium text-slate-800">
                    {khoaChartLabel(khoa)}
                  </td>
                  {columns.map((col) => {
                    const status = cellMap.get(`${khoa.id}|${col.id}`) ?? "not_applicable";
                    return (
                      <td key={col.id} className="px-1 py-1 text-center">
                        <span
                          className={`inline-block min-w-[3.5rem] rounded px-0.5 py-0.5 text-[9px] font-semibold leading-tight ${obligationCellClass[status]}`}
                        >
                          {TGS_OBLIGATION_LABELS[status]}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** KPI + xếp hạng + ma trận nghĩa vụ TGS theo `ap_dung_jsonb`. */
export function SupervisionTgsObligationBlock({
  catalog,
  hits,
  khoaOptions,
  gapRows,
  loading,
}: {
  catalog: BangKiemApDungSource[];
  hits: { khoa_id: string; bang_kiem_id: string }[];
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  gapRows?: GapKhoaRow[];
  loading?: boolean;
}) {
  const hitSet = useMemo(() => buildTgsHitSet(hits), [hits]);

  const khoaList = useMemo((): KhoaApDungContext[] => {
    return khoaOptions.map((o) => {
      const label = o.label;
      const maMatch = label.match(/^\[([^\]]+)\]/);
      return {
        id: o.id,
        khoi_id: o.khoi_id ?? null,
        ma_khoa: maMatch?.[1] ?? null,
        ten_khoa: label.replace(/^\[[^\]]+\]\s*/, ""),
        is_active: true,
      };
    });
  }, [khoaOptions]);

  const gapByKhoa = useMemo(() => {
    const m = new Map<string, { vol_tgs: number; ty_le_tgs: number | null }>();
    for (const r of gapRows ?? []) {
      m.set(r.id, { vol_tgs: r.vol_tgs, ty_le_tgs: r.ty_le_tgs });
    }
    return m;
  }, [gapRows]);

  const ranking = useMemo(
    () => buildTgsCoverageRanking(khoaList, catalog, hitSet, gapByKhoa),
    [khoaList, catalog, hitSet, gapByKhoa],
  );

  const avgBreadth = useMemo(() => {
    if (ranking.length === 0) return null;
    const sum = ranking.reduce((a, r) => a + r.ty_le_bao_phu_tgs, 0);
    return roundPercent2(sum / ranking.length);
  }, [ranking]);

  const underHalf = ranking.filter((r) => r.ty_le_bao_phu_tgs < 50).length;

  if (!loading && ranking.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-slate-500">Khoa có nghĩa vụ TGS</p>
          <p className="text-lg font-bold text-slate-800">{loading ? "…" : ranking.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-slate-500">TB bao phủ TGS</p>
          <p className="text-lg font-bold text-slate-800">
            {loading || avgBreadth == null ? "…" : formatPercent2(avgBreadth)}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-amber-800">Bao phủ &lt; 50%</p>
          <p className="text-lg font-bold text-amber-900">{loading ? "…" : underHalf}</p>
        </div>
      </div>
      <SupervisionTgsCoverageRankingTable rows={ranking} loading={loading} />
      <SupervisionObligationMatrix
        catalog={catalog}
        khoaList={khoaList}
        hitSet={hitSet}
        loading={loading}
      />
    </div>
  );
}

export { percentTooltipFormatter, mapTrendRows };
