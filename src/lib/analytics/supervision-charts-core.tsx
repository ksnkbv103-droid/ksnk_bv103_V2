"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompareRow } from "@/lib/analytics/supervision-analytics.types";
import type { BaoCaoTrendGranularity } from "@/modules/dashboard/types/bao-cao-tong-hop.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import { roundPercent2, formatPercent2 } from "@/lib/analytics/supervision-percent";
import { complianceToneFromPercent } from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import {
  bottomPercentHighlightIndices,
  highlightBarFill,
  momentRowBg,
  momentToneClass,
  percentTooltipFormatter,
  SupervisionResponsiveChart,
} from "@/lib/analytics/supervision-charts-shared";
import {
  normalizeGscTrendline,
  normalizeVstTrendline,
  pickSupervisionTrend,
  SUPERVISION_TREND_GRANULARITY_OPTIONS,
} from "@/lib/analytics/supervision-trend";

export type { CompareRow } from "@/lib/analytics/supervision-analytics.types";

export type MomentRow = {
  ten: string;
  tong_co_hoi: number;
  da_tuan_thu: number;
  ty_le_tuan_thu: number;
};

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
  source = "gsc",
  dataKey = "ty_le_tuan_thu",
  stroke = "#38bdf8",
}: {
  title: string;
  data: VstStrategicPayload["trendline"] | GscStrategicPayload["trendline"];
  loading?: boolean;
  source?: "vst" | "gsc";
  dataKey?: string;
  stroke?: string;
}) {
  const [granularity, setGranularity] = useState<BaoCaoTrendGranularity>("week");

  const chartData = useMemo(() => {
    const weekly =
      source === "vst"
        ? normalizeVstTrendline(data as VstStrategicPayload["trendline"])
        : normalizeGscTrendline(data as GscStrategicPayload["trendline"]);
    const picked = pickSupervisionTrend(weekly, granularity);
    return picked.map((row) => ({
      label: row.label,
      min_date: row.min_date,
      tong: row.tong,
      dat: row.dat,
      ty_le_tuan_thu: roundPercent2(row.ty_le_tuan_thu),
    }));
  }, [data, source, granularity]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <div className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 text-xs font-bold">
          {SUPERVISION_TREND_GRANULARITY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setGranularity(id)}
              className={`rounded-md px-3 py-1.5 ${granularity === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px]">
        {!loading && chartData.length > 0 ? (
          <SupervisionResponsiveChart className="h-full w-full min-w-0">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={percentTooltipFormatter} />
              <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} name="Tuân thủ (%)" />
            </LineChart>
          </SupervisionResponsiveChart>
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
          <SupervisionResponsiveChart className="h-full w-full min-w-0">
            {layout === "vertical" ? (
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="ten" width={88} tick={{ fontSize: 9 }} interval={0} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => {
                    const highlights = bottomPercentHighlightIndices(data.map((r) => r.ty_le_tuan_thu));
                    return (
                      <Cell key={`${entry.ten}-${index}`} fill={highlightBarFill("#38bdf8", highlights.has(index))} />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={56} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#38bdf8">
                  {data.map((entry, index) => {
                    const highlights = bottomPercentHighlightIndices(data.map((r) => r.ty_le_tuan_thu));
                    return (
                      <Cell key={`${entry.ten}-${index}`} fill={highlightBarFill("#38bdf8", highlights.has(index))} />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </SupervisionResponsiveChart>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {loading ? "Đang tải…" : "Chưa có dữ liệu"}
          </p>
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
            <SupervisionResponsiveChart className="h-full w-full min-w-0">
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
            </SupervisionResponsiveChart>
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

