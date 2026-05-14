"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
import type { GscDashboardPayload } from "../actions/giam-sat-chung-dashboard.types";

type MonthlyRow = GscDashboardPayload["monthly"][number];
type ByLoaiRow = GscDashboardPayload["by_loai_bang_kiem"][number];

type Props = {
  monthly: MonthlyRow[];
  by_loai_bang_kiem: ByLoaiRow[];
};

/**
 * Tách Recharts sang chunk riêng (dynamic import từ GscDashboardPanel) để giảm JS ban đầu.
 */
export default function GscDashboardPanelCharts({ monthly, by_loai_bang_kiem }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <h3 className="mb-3 text-[11px] font-black uppercase text-slate-700">Xu hướng điểm theo tháng</h3>
        <Bv103ResponsiveChart className="h-[280px] w-full min-w-0">
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="diem_tb" name="Điểm TB" stroke="#026f17" strokeWidth={3} />
          </LineChart>
        </Bv103ResponsiveChart>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <h3 className="mb-3 text-[11px] font-black uppercase text-slate-700">Theo loại bảng kiểm</h3>
        <Bv103ResponsiveChart className="h-[280px] w-full min-w-0">
          <BarChart data={by_loai_bang_kiem}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="loai_bang_kiem" tick={{ fill: "#64748b", fontSize: 9 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="so_phien" fill="#2563eb" radius={[10, 10, 0, 0]} />
          </BarChart>
        </Bv103ResponsiveChart>
      </div>
    </div>
  );
}
