"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import type { CoverageTopicInput, GapKhoaRow, GapKhoaSortMetric, GapKhoaSortOrder } from "@/lib/analytics/supervision-matrix-mappers";
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
  KHOA_COMPLIANCE_WARN_PCT,
  sortGapRowsByMetric,
  type CoverageCellStatus,
} from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import { BAO_CAO_TONG_HOP_THRESHOLDS, complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import {
  complianceBarColor,
  formatGapPctWithDatTong,
  gapCompareStatus,
  gapPctTone,
  GapSortToolbar,
  KhoaChartViewport,
  khoaCategoryYAxis,
  khoaHorizontalPercentChart,
  KsnkSolidBarShape,
  momentRowBg,
  momentToneClass,
  percentTooltipFormatter,
  SupervisionKhoaPercentBlock,
  TgsDashedBarShape,
  useSortedGapRows,
} from "@/lib/analytics/supervision-charts-shared";

export function SupervisionKhoaTriptych({
  rows,
  loading,
  moduleLabel,
  sortMetric = "ty_le_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sortedRows = useMemo(
    () => sortGapRowsByMetric(rows, sortMetric, sortOrder),
    [rows, sortMetric, sortOrder],
  );

  if (!loading && rows.length === 0) return null;

  const prefix = moduleLabel ? `${moduleLabel} · ` : "";
  const gapData = sortedRows
    .filter((r) => isGapComparable(r))
    .map((r) => ({
      ten: r.label,
      fullName: r.ten,
      ty_le_tgs: r.ty_le_tgs,
      ty_le_ksnk: r.ty_le_ksnk,
      tgs_dat: r.dat_tgs,
      tgs_tong: r.vol_tgs,
      ksnk_dat: r.dat_ksnk,
      ksnk_tong: r.vol_ksnk,
    }));

  const gapTooltipFormatter = (value: unknown, name: unknown, item?: { payload?: Record<string, unknown> }) => {
    const payload = item?.payload;
    const isTgs = String(name ?? "").includes("Tự GS");
    const dat = isTgs ? payload?.tgs_dat : payload?.ksnk_dat;
    const tong = isTgs ? payload?.tgs_tong : payload?.ksnk_tong;
    return percentTooltipFormatter(value, name, { payload: { dat, tong } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <h3 className="text-sm font-bold text-slate-800">Tuân thủ theo khoa</h3>
        <div className="flex flex-wrap items-center gap-2">
          {onSortOrderChange ? (
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
            >
              Sắp xếp %: {sortOrder === "asc" ? "thấp → cao" : "cao → thấp"}
            </button>
          ) : null}
          <p className="text-[11px] text-slate-500">
            {prefix}Biểu đồ ngang theo mã khoa — tách nguồn KSNK, Tự GS và đối soát song song.
          </p>
        </div>
      </div>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Giám sát KSNK (theo khoa)`}
        loading={loading}
        hasData={sortedRows.some((r) => r.ty_le_ksnk != null)}
        rowCount={sortedRows.length}
      >
        {khoaHorizontalPercentChart(
          sortedRows.map((r) => ({
            label: r.label,
            value: r.ty_le_ksnk,
            dat: r.dat_ksnk,
            tong: r.vol_ksnk,
            fullName: r.ten,
          })),
          "KSNK (%)",
          "#38bdf8",
          true,
        )}
      </SupervisionKhoaPercentBlock>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Khoa tự giám sát (theo khoa)`}
        loading={loading}
        hasData={sortedRows.some((r) => r.ty_le_tgs != null)}
        rowCount={sortedRows.length}
      >
        {khoaHorizontalPercentChart(
          sortedRows.map((r) => ({
            label: r.label,
            value: r.ty_le_tgs,
            dat: r.dat_tgs,
            tong: r.vol_tgs,
            fullName: r.ten,
          })),
          "Tự GS (%)",
          "#fbbf24",
          true,
        )}
      </SupervisionKhoaPercentBlock>

      <SupervisionKhoaPercentBlock
        title={`${prefix}Đối soát Tự giám sát vs KSNK (theo khoa)`}
        loading={loading}
        hasData={gapData.length > 0}
        rowCount={gapData.length || sortedRows.length}
      >
        <Bv103ResponsiveChart className="h-full w-full min-w-0">
          <BarChart data={gapData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
            <YAxis {...khoaCategoryYAxis} />
            <Tooltip formatter={gapTooltipFormatter} labelFormatter={(_l, p) => String(p?.[0]?.payload?.fullName ?? _l)} />
            <Legend />
            <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" maxBarSize={16} />
            <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#38bdf8" maxBarSize={16} />
          </BarChart>
        </Bv103ResponsiveChart>
      </SupervisionKhoaPercentBlock>
      {!loading && gapData.length === 0 && sortedRows.some((r) => gapExclusionReason(r)) ? (
        <p className="px-1 text-[11px] text-slate-500">
          Không có khoa đủ hai nguồn TGS và KSNK trong kỳ — lý do loại trừ hiển thị trên tooltip biểu đồ gộp.
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
      <KhoaChartViewport rowCount={rows.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
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
              <Bar dataKey="vol_tgs" name={volumeLabel} maxBarSize={20}>
                {chartData.map((entry) => (
                  <Cell key={entry.ten} fill={entry.covered ? "#fbbf24" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </Bv103ResponsiveChart>
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </KhoaChartViewport>
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
      <KhoaChartViewport rowCount={rows.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
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
              <Bar dataKey="vol_ksnk" name={volumeLabel} maxBarSize={20}>
                {chartData.map((entry) => (
                  <Cell key={entry.ten} fill={entry.covered ? "#38bdf8" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </Bv103ResponsiveChart>
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </KhoaChartViewport>
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
                  <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                    {r.label}
                  </td>
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
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
                          className={`inline-block min-w-[4.5rem] rounded px-1 py-0.5 text-[11px] font-semibold ${coverageCellClass[cell]}`}
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

/** Biểu đồ cột gộp % tuân thủ — KSNK · TGS trên một chart (thay triptych / bảng). */
export function SupervisionKhoaComplianceChart({
  rows,
  loading,
  moduleLabel,
  sortMetric = "ty_le_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const title = moduleLabel ? `Tỷ lệ tuân thủ · ${moduleLabel}` : "Tỷ lệ tuân thủ theo khoa";

  const chartData = sorted.map((r) => {
    const compare = gapCompareStatus(r);
    return {
      ten: r.label,
      fullName: r.ten,
      ty_le_ksnk: r.ty_le_ksnk,
      ty_le_tgs: r.ty_le_tgs,
      ksnk_dat: r.dat_ksnk,
      ksnk_tong: r.vol_ksnk,
      tgs_dat: r.dat_tgs,
      tgs_tong: r.vol_tgs,
      compareLabel: compare.label,
    };
  });

  const seriesTooltip = (
    value: unknown,
    name: unknown,
    item?: { payload?: Record<string, unknown> },
  ) => {
    const payload = item?.payload;
    const isTgs = String(name ?? "").includes("TGS") || String(name ?? "").includes("Tự GS");
    const dat = isTgs ? payload?.tgs_dat : payload?.ksnk_dat;
    const tong = isTgs ? payload?.tgs_tong : payload?.ksnk_tong;
    const pct = formatPercent2(value);
    const vol = dat != null && tong != null && Number(tong) > 0
      ? `${Number(dat).toLocaleString()}/${Number(tong).toLocaleString()} (${pct})`
      : pct;
    return [vol, String(name ?? "Tuân thủ")];
  };

  const labelTooltip = (_label: unknown, payload: readonly { payload?: Record<string, unknown> }[] | undefined) => {
    const row = payload?.[0]?.payload;
    const fullName = String(row?.fullName ?? _label);
    const compare = row?.compareLabel ? ` · ${row.compareLabel}` : "";
    return `${fullName}${compare}`;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-800">{title}</h3>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <KhoaChartViewport rowCount={chartData.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
              <Tooltip formatter={seriesTooltip} labelFormatter={labelTooltip} />
              <Legend />
              <ReferenceLine
                x={KHOA_COMPLIANCE_WARN_PCT}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `${KHOA_COMPLIANCE_WARN_PCT}%`,
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "#64748b",
                }}
              />
              <Bar dataKey="ty_le_ksnk" name="Giám sát KSNK (%)" fill="#38bdf8" maxBarSize={14} shape={KsnkSolidBarShape}>
                {chartData.map((entry) => (
                  <Cell
                    key={`ksnk-${entry.ten}`}
                    fill={complianceBarColor("#38bdf8", entry.ty_le_ksnk)}
                  />
                ))}
              </Bar>
              <Bar dataKey="ty_le_tgs" name="Tự giám sát (%)" fill="#fbbf24" maxBarSize={14} shape={TgsDashedBarShape}>
                {chartData.map((entry) => (
                  <Cell
                    key={`tgs-${entry.ten}`}
                    fill={complianceBarColor("#fbbf24", entry.ty_le_tgs)}
                  />
                ))}
              </Bar>
            </BarChart>
          </Bv103ResponsiveChart>
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </KhoaChartViewport>
      <p className="mt-2 text-[11px] text-slate-400">
        Hai cột song song trên cùng biểu đồ: giám sát KSNK (liền) và tự giám sát (nét đứt). Tooltip: đạt/tổng và trạng thái đối soát; màu cảnh báo khi &lt;{KHOA_COMPLIANCE_WARN_PCT}%.
      </p>
    </div>
  );
}

/** Biểu đồ cột gộp khối lượng — KSNK · TGS trên một chart (thay 2 biểu đồ vol riêng). */
export function SupervisionKhoaVolumeChart({
  rows,
  loading,
  moduleLabel,
  ksnkVolumeLabel = "KSNK",
  tgsVolumeLabel = "TGS",
  sortMetric = "vol_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  ksnkVolumeLabel?: string;
  tgsVolumeLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const { covered: tgsCovered, total } = countTgsCoveredKhoa(rows);
  const { covered: ksnkCovered } = countKsnkCoveredKhoa(rows);
  const title = moduleLabel ? `Khối lượng giám sát · ${moduleLabel}` : "Khối lượng giám sát theo khoa";

  const chartData = sorted.map((r) => {
    const compare = gapCompareStatus(r);
    return {
      ten: r.label,
      fullName: r.ten,
      vol_ksnk: r.vol_ksnk,
      vol_tgs: r.vol_tgs,
      dat_ksnk: r.dat_ksnk,
      dat_tgs: r.dat_tgs,
      compareLabel: compare.label,
    };
  });

  const volTooltip = (
    value: unknown,
    name: unknown,
    item?: { payload?: Record<string, unknown> },
  ) => {
    const payload = item?.payload;
    const isTgs = String(name ?? "").includes("TGS");
    const dat = isTgs ? payload?.dat_tgs : payload?.dat_ksnk;
    const vol = Number(value ?? 0);
    if (dat != null && vol > 0) {
      return [`${Number(dat).toLocaleString()}/${vol.toLocaleString()}`, String(name ?? "Khối lượng")];
    }
    return [vol.toLocaleString(), String(name ?? "Khối lượng")];
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-[11px] font-medium text-slate-600">
          {loading ? "…" : (
            <>
              <span className="font-bold text-sky-700">{ksnkCovered}</span>/{total} KSNK ·{" "}
              <span className="font-bold text-amber-700">{tgsCovered}</span>/{total} TGS
            </>
          )}
        </p>
      </div>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <KhoaChartViewport rowCount={chartData.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
              <Tooltip
                formatter={volTooltip}
                labelFormatter={(_label, payload) => {
                  const row = Array.isArray(payload) ? payload[0]?.payload : undefined;
                  const compare = row?.compareLabel ? ` · ${row.compareLabel}` : "";
                  return `${String(row?.fullName ?? _label)}${compare}`;
                }}
              />
              <Legend />
              <Bar dataKey="vol_ksnk" name={ksnkVolumeLabel} fill="#38bdf8" maxBarSize={14} shape={KsnkSolidBarShape}>
                {chartData.map((entry) => (
                  <Cell key={`vksnk-${entry.ten}`} fill={entry.vol_ksnk > 0 ? "#38bdf8" : "#e2e8f0"} />
                ))}
              </Bar>
              <Bar dataKey="vol_tgs" name={tgsVolumeLabel} fill="#fbbf24" maxBarSize={14} shape={TgsDashedBarShape}>
                {chartData.map((entry) => (
                  <Cell key={`vtgs-${entry.ten}`} fill={entry.vol_tgs > 0 ? "#fbbf24" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </Bv103ResponsiveChart>
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
        )}
      </KhoaChartViewport>
      <p className="mt-2 text-[11px] text-slate-400">
        Khối lượng quan sát/khảo sát: giám sát KSNK (liền) và tự giám sát (nét đứt). Cột xám = chưa có dữ liệu trong kỳ.
      </p>
    </div>
  );
}

/** @deprecated Dùng SupervisionKhoaComplianceChart — bảng thay biểu đồ, không dùng trên analytics web. */
export function SupervisionKhoaComplianceTable({
  rows,
  loading,
  moduleLabel,
  sortMetric = "ty_le_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const title = moduleLabel ? `Tỷ lệ tuân thủ · ${moduleLabel}` : "Tỷ lệ tuân thủ theo khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-800">{title}</h3>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">KSNK %</th>
              <th className="px-2 py-2 text-center">TGS %</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
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
              sorted.map((r, index) => {
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const compare = gapCompareStatus(r);
                const rowWarn =
                  (r.ty_le_ksnk != null && r.ty_le_ksnk < KHOA_COMPLIANCE_WARN_PCT) ||
                  (r.ty_le_tgs != null && r.ty_le_tgs < KHOA_COMPLIANCE_WARN_PCT);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 ${rowWarn ? momentRowBg[ksnkTone !== "neutral" ? ksnkTone : tgsTone] : ""}`}
                  >
                    <td className="px-2 py-2 tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                      {r.label}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[ksnkTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[tgsTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
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

/** @deprecated Dùng SupervisionKhoaVolumeChart — bảng thay biểu đồ, không dùng trên analytics web. */
export function SupervisionKhoaCountsTable({
  rows,
  loading,
  moduleLabel,
  tgsVolumeLabel = "TGS",
  ksnkVolumeLabel = "KSNK",
  sortMetric = "vol_ksnk",
  sortOrder = "desc",
  onSortOrderChange,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  tgsVolumeLabel?: string;
  ksnkVolumeLabel?: string;
  sortMetric?: GapKhoaSortMetric;
  sortOrder?: GapKhoaSortOrder;
  onSortOrderChange?: (order: GapKhoaSortOrder) => void;
}) {
  const sorted = useSortedGapRows(rows, undefined, sortMetric, sortOrder);
  if (!loading && sorted.length === 0) return null;

  const { covered: tgsCovered, total } = countTgsCoveredKhoa(rows);
  const { covered: ksnkCovered } = countKsnkCoveredKhoa(rows);
  const title = moduleLabel ? `Khối lượng giám sát · ${moduleLabel}` : "Khối lượng giám sát theo khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-[11px] font-medium text-slate-600">
          {loading ? "…" : (
            <>
              <span className="font-bold text-sky-700">{ksnkCovered}</span>/{total} KSNK ·{" "}
              <span className="font-bold text-amber-700">{tgsCovered}</span>/{total} TGS
            </>
          )}
        </p>
      </div>
      <GapSortToolbar
        sortMetric={sortMetric}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
        moduleLabel={moduleLabel}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">{ksnkVolumeLabel}</th>
              <th className="px-2 py-2 text-center">{tgsVolumeLabel}</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
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
              sorted.map((r, index) => {
                const compare = gapCompareStatus(r);
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                      {r.label}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_ksnk > 0 ? (
                        <span className="font-semibold text-sky-800">
                          {r.dat_ksnk.toLocaleString()}/{r.vol_ksnk.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_tgs > 0 ? (
                        <span className="font-semibold text-amber-800">
                          {r.dat_tgs.toLocaleString()}/{r.vol_tgs.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
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

/** Bảng master khoa: khối lượng · % · trạng thái đối soát · CCS (báo cáo tổng hợp). */
export function SupervisionKhoaMasterTable({
  gapRows,
  rankRows,
  loading,
  moduleLabel,
}: {
  gapRows: GapKhoaRow[];
  rankRows?: BaoCaoKhoaRankRow[];
  loading?: boolean;
  moduleLabel?: string;
}) {
  const rankById = useMemo(() => new Map((rankRows ?? []).map((r) => [r.id, r])), [rankRows]);
  const sorted = useSortedGapRows(gapRows, rankRows, "ty_le_ksnk", "desc");

  if (!loading && sorted.length === 0 && !rankRows?.length) return null;

  const title = moduleLabel ? `Bảng tổng hợp khoa · ${moduleLabel}` : "Bảng tổng hợp khoa";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Khối lượng TGS/KSNK, tỷ lệ tuân thủ (đạt/tổng) và trạng thái đối soát — tô cảnh báo &lt;
        {KHOA_COMPLIANCE_WARN_PCT}%.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Khoa</th>
              <th className="px-2 py-2 text-center">TGS vol</th>
              <th className="px-2 py-2 text-center">KSNK vol</th>
              <th className="px-2 py-2 text-center">TGS %</th>
              <th className="px-2 py-2 text-center">KSNK %</th>
              <th className="px-2 py-2 text-center">Đối soát</th>
              {rankRows ? <th className="px-2 py-2 text-center">CCS %</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={rankRows ? 8 : 7} className="px-2 py-4 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              sorted.map((r, index) => {
                const rank = rankById.get(r.id);
                const compare = gapCompareStatus(r);
                const ksnkTone = gapPctTone(r.ty_le_ksnk);
                const tgsTone = gapPctTone(r.ty_le_tgs);
                const ccsTone = rank ? complianceToneFromPercent(rank.ty_le_ccs) : "neutral";
                const rowWarn =
                  (r.ty_le_ksnk != null && r.ty_le_ksnk < KHOA_COMPLIANCE_WARN_PCT) ||
                  (r.ty_le_tgs != null && r.ty_le_tgs < KHOA_COMPLIANCE_WARN_PCT);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 ${rowWarn ? momentRowBg[ksnkTone !== "neutral" ? ksnkTone : tgsTone] : ""}`}
                  >
                    <td className="px-2 py-2 tabular-nums text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800" title={r.ten}>
                      {r.label}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_tgs > 0 ? `${r.dat_tgs.toLocaleString()}/${r.vol_tgs.toLocaleString()}` : "0"}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {r.vol_ksnk > 0 ? `${r.dat_ksnk.toLocaleString()}/${r.vol_ksnk.toLocaleString()}` : "0"}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[tgsTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_tgs, r.dat_tgs, r.vol_tgs)}
                    </td>
                    <td className={`px-2 py-2 text-center tabular-nums font-semibold ${momentToneClass[ksnkTone]}`}>
                      {formatGapPctWithDatTong(r.ty_le_ksnk, r.dat_ksnk, r.vol_ksnk)}
                    </td>
                    <td className={`px-2 py-2 text-center text-[11px] font-medium ${momentToneClass[compare.tone]}`}>
                      {compare.label}
                    </td>
                    {rankRows ? (
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums ${momentToneClass[ccsTone]}`}>
                        {rank?.has_data === false ? "Chưa GS" : rank?.ty_le_ccs != null ? formatPercent2(rank.ty_le_ccs) : "—"}
                      </td>
                    ) : null}
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

/** Dashboard khoa: biểu đồ gộp % + khối lượng (web = charts; bảng master chỉ báo cáo tổng hợp). */
export function SupervisionKhoaAnalyticsBlock({
  rows,
  loading,
  moduleLabel,
  tgsVolumeLabel,
  ksnkVolumeLabel,
  rankRows,
  showMasterTable,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  tgsVolumeLabel?: string;
  ksnkVolumeLabel?: string;
  /** @deprecated Ma trận bao phủ đã gộp vào tooltip đối soát; giữ prop để không break caller cũ. */
  coverageTopics?: CoverageTopicInput[];
  rankRows?: BaoCaoKhoaRankRow[];
  showMasterTable?: boolean;
}) {
  const [sortOrder, setSortOrder] = React.useState<GapKhoaSortOrder>("desc");

  if (!loading && rows.length === 0) return null;

  return (
    <div className="space-y-4">
      <SupervisionKhoaComplianceChart
        rows={rows}
        loading={loading}
        moduleLabel={moduleLabel}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
      <SupervisionKhoaVolumeChart
        rows={rows}
        loading={loading}
        moduleLabel={moduleLabel}
        tgsVolumeLabel={tgsVolumeLabel}
        ksnkVolumeLabel={ksnkVolumeLabel}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
      {showMasterTable ? (
        <SupervisionKhoaMasterTable
          gapRows={rows}
          rankRows={rankRows}
          loading={loading}
          moduleLabel={moduleLabel}
        />
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
      <KhoaChartViewport rowCount={data.length}>
        {!loading && data.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
              <Tooltip formatter={percentTooltipFormatter} />
              <Legend />
              <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" maxBarSize={16} />
              <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#38bdf8" maxBarSize={16} />
            </BarChart>
          </Bv103ResponsiveChart>
        ) : (
          <p className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</p>
        )}
      </KhoaChartViewport>
    </div>
  );
}

/** Radar 5 moment WHO + bảng số luôn hiện (không phụ thuộc hover) — dùng khi báo cáo VST. */