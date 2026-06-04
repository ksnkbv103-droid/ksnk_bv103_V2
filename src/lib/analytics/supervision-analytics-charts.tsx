"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";

export type CompareRow = { ten: string; ty_le_tuan_thu: number; tong?: number; dat?: number };

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
      <div className="h-[260px]">
        {!loading && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ten" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={56} />
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

export function SupervisionCompareGrid({
  sections,
  loading,
}: {
  loading?: boolean;
  sections: { title: string; rows: CompareRow[] }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sections.map((s) => (
        <SupervisionCompareBarChart key={s.title} title={s.title} rows={s.rows} loading={loading} />
      ))}
    </div>
  );
}

export { percentTooltipFormatter, mapTrendRows };
