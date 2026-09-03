"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import type { CoverageTopicInput, GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";
import {
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  KHOA_COMPLIANCE_WARN_PCT,
  resolveKhoaAggregateTyLe,
  resolveKhoaAggregateVol,
  sortGapRowsByAggregateTyLe,
  sortGapRowsByMetric,
  type GapKhoaSourceRow,
} from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import {
  complianceBarColor,
  gapCompareStatus,
  KHOA_BAR_CHART_MARGIN,
  KhoaChartViewport,
  KhoaComplianceBarLabel,
  khoaCategoryYAxis,
  khoaVolumeBarLabelContent,
  KsnkSolidBarShape,
  percentTooltipFormatter,
  TgsDashedBarShape,
} from "@/lib/analytics/supervision-charts-shared";
import { SupervisionKhoaMasterTable } from "@/lib/analytics/supervision-charts-khoa-tables";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";

function defaultVolumeTitle(moduleLabel?: string): string {
  if (moduleLabel === "VST") return "Số cơ hội giám sát theo khoa";
  if (moduleLabel === "GSC") return "Khối lượng khảo sát theo khoa";
  return "Khối lượng giám sát theo khoa";
}

type MatrixKhoaRow = GapKhoaSourceRow & {
  ty_le_tuan_thu?: number;
  tong_co_hoi?: number;
  da_tuan_thu?: number;
  tong_quan_sat?: number;
  tong_dat?: number;
};

/** Biểu đồ % tuân thủ theo khoa — full width, sắp xếp cao → thấp, cảnh báo &lt;80%. */
function SupervisionKhoaComplianceChart({
  rows,
  matrixKhoaRows,
  loading,
  moduleLabel,
}: {
  rows: GapKhoaRow[];
  matrixKhoaRows?: MatrixKhoaRow[] | null;
  loading?: boolean;
  moduleLabel?: string;
}) {
  const sorted = React.useMemo(
    () => sortGapRowsByAggregateTyLe(rows, matrixKhoaRows, "desc"),
    [rows, matrixKhoaRows],
  );
  const matrixById = React.useMemo(() => {
    const map = new Map<string, MatrixKhoaRow>();
    for (const r of matrixKhoaRows ?? []) {
      const id = String(r.id ?? r.ma_khoa ?? "").trim();
      if (id) map.set(id, r);
    }
    return map;
  }, [matrixKhoaRows]);
  if (!loading && sorted.length === 0) return null;

  const title = "Tỷ lệ tuân thủ theo khoa";

  const chartData = sorted.map((r) => {
    const matrix = matrixById.get(r.id);
    const ty_le = resolveKhoaAggregateTyLe(r, matrix?.ty_le_tuan_thu);
    const vol = resolveKhoaAggregateVol(r, matrix);
    return {
      ten: r.label,
      fullName: r.ten,
      ty_le_tuan_thu: ty_le,
      dat: vol.dat,
      tong: vol.tong,
    };
  });

  const labelTooltip = (_label: unknown, payload: readonly { payload?: Record<string, unknown> }[] | undefined) => {
    const row = payload?.[0]?.payload;
    return String(row?.fullName ?? _label);
  };

  return (
    <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mb-2 text-[11px] font-medium text-slate-500">Sắp xếp: cao → thấp (tuân thủ %)</p>
      <KhoaChartViewport rowCount={chartData.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={KHOA_BAR_CHART_MARGIN}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis {...khoaCategoryYAxis} />
              <Tooltip formatter={percentTooltipFormatter} labelFormatter={labelTooltip} />
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
              <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#38bdf8" maxBarSize={18} radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={`agg-${entry.ten}`}
                    fill={complianceBarColor("#38bdf8", entry.ty_le_tuan_thu)}
                  />
                ))}
                <LabelList dataKey="ty_le_tuan_thu" content={KhoaComplianceBarLabel} />
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
        Số trên cột: % tuân thủ · đạt/tổng cơ hội. Màu vàng/đỏ khi tuân thủ &lt;{KHOA_COMPLIANCE_WARN_PCT}%.
        {moduleLabel ? ` · ${moduleLabel}` : ""}
      </p>
    </div>
  );
}

/** Biểu đồ cột gộp khối lượng — sắp xếp cao → thấp theo tổng cơ hội/khảo sát. */
function SupervisionKhoaVolumeChart({
  rows,
  loading,
  moduleLabel,
  chartTitle,
  ksnkVolumeLabel = SUPERVISION_SOURCE_UI.ksnk,
  tgsVolumeLabel = SUPERVISION_SOURCE_UI.tgs,
}: {
  rows: GapKhoaRow[];
  loading?: boolean;
  moduleLabel?: string;
  chartTitle?: string;
  ksnkVolumeLabel?: string;
  tgsVolumeLabel?: string;
}) {
  const sorted = React.useMemo(
    () => sortGapRowsByMetric(rows, "vol_total", "desc"),
    [rows],
  );
  if (!loading && sorted.length === 0) return null;

  const { covered: tgsCovered, total } = countTgsCoveredKhoa(rows);
  const { covered: ksnkCovered } = countKsnkCoveredKhoa(rows);
  const title = chartTitle ?? defaultVolumeTitle(moduleLabel);

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
      <p className="mb-2 text-[11px] font-medium text-slate-500">Sắp xếp: cao → thấp (khối lượng)</p>
      <KhoaChartViewport rowCount={chartData.length}>
        {!loading && chartData.length > 0 ? (
          <Bv103ResponsiveChart className="h-full w-full min-w-0">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={KHOA_BAR_CHART_MARGIN}
            >
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
                <LabelList dataKey="vol_ksnk" content={khoaVolumeBarLabelContent("ksnk")} />
              </Bar>
              <Bar dataKey="vol_tgs" name={tgsVolumeLabel} fill="#fbbf24" maxBarSize={14} shape={TgsDashedBarShape}>
                {chartData.map((entry) => (
                  <Cell key={`vtgs-${entry.ten}`} fill={entry.vol_tgs > 0 ? "#fbbf24" : "#e2e8f0"} />
                ))}
                <LabelList dataKey="vol_tgs" content={khoaVolumeBarLabelContent("tgs")} />
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
        Số trên cột: đạt/tổng cơ hội giám sát (KSNK liền · TGS nét đứt). Cột xám = chưa có dữ liệu trong kỳ.
      </p>
    </div>
  );
}

/** Dashboard khoa: biểu đồ gộp % + khối lượng — full width, đủ mã khoa, cảnh báo &lt;80%. */
export function SupervisionKhoaAnalyticsBlock({
  rows,
  matrixKhoaRows,
  loading,
  moduleLabel,
  tgsVolumeLabel,
  ksnkVolumeLabel,
  volumeChartTitle,
  rankRows,
  showMasterTable,
  className,
}: {
  rows: GapKhoaRow[];
  matrixKhoaRows?: MatrixKhoaRow[] | null;
  loading?: boolean;
  moduleLabel?: string;
  tgsVolumeLabel?: string;
  ksnkVolumeLabel?: string;
  volumeChartTitle?: string;
  /** @deprecated Ma trận bao phủ đã gộp vào tooltip đối soát; giữ prop để không break caller cũ. */
  coverageTopics?: CoverageTopicInput[];
  rankRows?: BaoCaoKhoaRankRow[];
  showMasterTable?: boolean;
  className?: string;
}) {
  if (!loading && rows.length === 0) return null;

  const resolvedVolumeTitle = volumeChartTitle ?? defaultVolumeTitle(moduleLabel);

  return (
    <div className={`w-full min-w-0 space-y-[var(--bv103-space-3)] ${className ?? ""}`}>
      <SupervisionKhoaComplianceChart
        rows={rows}
        matrixKhoaRows={matrixKhoaRows}
        loading={loading}
        moduleLabel={moduleLabel}
      />
      <SupervisionKhoaVolumeChart
        rows={rows}
        loading={loading}
        moduleLabel={moduleLabel}
        chartTitle={resolvedVolumeTitle}
        tgsVolumeLabel={tgsVolumeLabel}
        ksnkVolumeLabel={ksnkVolumeLabel}
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

