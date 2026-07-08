"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
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
  sortGapRowsByMetric,
  type CoverageCellStatus,
} from "@/lib/analytics/supervision-matrix-mappers";
import {
  KhoaChartViewport,
  khoaCategoryYAxis,
  khoaHorizontalPercentChart,
  percentTooltipFormatter,
  SupervisionKhoaPercentBlock,
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
                formatter={(value: unknown) => {
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
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
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
      </ResponsiveTableShell>
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
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(360px,50dvh)]">
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
      </ResponsiveTableShell>
    </div>
  );
}
