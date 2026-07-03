"use client";

import React from "react";
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
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  KHOA_COMPLIANCE_WARN_PCT,
} from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import {
  complianceBarColor,
  gapCompareStatus,
  GapSortToolbar,
  KhoaChartViewport,
  khoaCategoryYAxis,
  KsnkSolidBarShape,
  percentTooltipFormatter,
  TgsDashedBarShape,
  useSortedGapRows,
} from "@/lib/analytics/supervision-charts-shared";
import { SupervisionKhoaMasterTable } from "@/lib/analytics/supervision-charts-khoa-tables";

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
