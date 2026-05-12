"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import type { KhoaBarRow } from "./vst-dashboard-panel-derive";

type TyLePoint = { label: string; ty_le: number };

/** Cùng kiểu đồ thị đường + trục % với xu hướng thời gian (chỉ khác nhãn trục X). */
export function VstTrendStyleLineChart({ data }: { data: TyLePoint[] }) {
  if (!data.length) {
    return <div className="text-xs text-slate-400 py-4 text-center">Không có dữ liệu</div>;
  }
  const tiltLabels = data.length > 6;
  return (
    <Bv103ResponsiveChart className="h-[300px] w-full min-w-0">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: tiltLabels ? 28 : 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
            tickMargin={10}
            interval={0}
            angle={tiltLabels ? -35 : 0}
            textAnchor={tiltLabels ? "end" : "middle"}
            height={tiltLabels ? 70 : undefined}
          />
          <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            formatter={(value: unknown) => [`${value ?? ""}%`, "Tỷ lệ tuân thủ"]}
          />
          <Line
            type="monotone"
            dataKey="ty_le"
            name="Tỷ lệ %"
            stroke="#026f17"
            strokeWidth={4}
            dot={{ r: 4, fill: "#026f17", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, fill: "#026f17", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
    </Bv103ResponsiveChart>
  );
}

/** Cột ngang: mọi khoa, % tuân thủ luôn trên nhãn đầu cột (bên phải). */
export function KhoaComplianceBarChart({ rows }: { rows: KhoaBarRow[] }) {
  if (!rows.length) {
    return <div className="text-xs text-slate-400 py-4 text-center">Không có dữ liệu so sánh theo khoa</div>;
  }
  const h = Math.min(1200, Math.max(320, rows.length * 26 + 56));

  return (
    <Bv103ResponsiveChart className="w-full min-w-0" style={{ height: h }}>
        <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 52, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="ten"
            width={168}
            tick={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v: unknown) => [`${v ?? ""}%`, "Tỷ lệ tuân thủ"]}
            labelFormatter={(label) => String(label)}
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          />
          <Bar dataKey="ty_le" radius={[0, 6, 6, 0]} barSize={20} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={`${r.ten}-${r.ty_le}`} fill={r.barColor} />
            ))}
            <LabelList
              dataKey="ty_le"
              position="right"
              fontSize={10}
              fill="#0f172a"
              fontWeight={700}
              formatter={(v: unknown) => `${v ?? ""}%`}
            />
          </Bar>
        </BarChart>
    </Bv103ResponsiveChart>
  );
}

export function RateBarChart({
  rows,
  heightPx = 280,
}: {
  rows: Array<{ ten: string; dat: number; tong: number; ty_le: number }>;
  heightPx?: number;
}) {
  if (!rows || rows.length === 0)
    return <div className="text-xs text-slate-400 py-4 text-center">Không có dữ liệu so sánh</div>;

  return (
    <Bv103ResponsiveChart style={{ height: heightPx }} className="min-h-[200px] w-full min-w-0">
        <BarChart data={rows} margin={{ top: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="ten" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="ty_le" fill="#026f17" radius={[6, 6, 0, 0]} barSize={32}>
            <LabelList
              dataKey="ty_le"
              position="top"
              fontSize={11}
              fill="#026f17"
              fontWeight="bold"
              formatter={(val: unknown) => `${val ?? ""}%`}
            />
          </Bar>
        </BarChart>
    </Bv103ResponsiveChart>
  );
}
