"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  ListChecks,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
} from "lucide-react";
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";

export type QlcvThongKeSummary = {
  tong: number;
  mo: number;
  hoanThanh: number;
  quaHan: number;
  dungHan: number;
  pctHoanThanh: number | null;
  pctQuaHan: number | null;
  pctDungHan: number | null;
};

export type QlcvThongKeChartsProps = {
  theoNguoi: {
    phu_trach: string;
    mo: number;
    qua_han: number;
    hoan_thanh: number;
    dung_han: number;
  }[];
  theoTrangThai: {
    ma: string;
    nhan: string;
    so_luong: number;
  }[];
  summary: QlcvThongKeSummary;
};

const PIE_COLORS: Record<string, string> = {
  MOI: "#94a3b8", // slate-400
  DANG_LAM: "#0284c7", // sky-600
  CHO_DUYET: "#8b5cf6", // violet-500
  HOAN_THANH: "#10b981", // emerald-500
  QUA_HAN: "#ef4444", // red-500
  TU_CHOI: "#f97316", // orange-500
  DA_HUY: "#64748b", // slate-500
};

const DEFAULT_COLOR = "#0284c7";

export function QlcvThongKeCharts({ theoNguoi, theoTrangThai, summary }: QlcvThongKeChartsProps) {
  // Chuẩn bị dữ liệu nhân sự (Top 10 theo tổng số việc để biểu đồ gọn gàng)
  const chartNhanSuData = useMemo(() => {
    return [...theoNguoi]
      .sort((a, b) => b.mo + b.hoan_thanh - (a.mo + a.hoan_thanh))
      .slice(0, 10)
      .map((r) => ({
        name: r.phu_trach.length > 14 ? `${r.phu_trach.slice(0, 12)}…` : r.phu_trach,
        fullName: r.phu_trach,
        "Đang mở": r.mo,
        "Hoàn thành": r.hoan_thanh,
        "Quá hạn": r.qua_han,
      }));
  }, [theoNguoi]);

  // Chuẩn bị dữ liệu trạng thái
  const pieTrangThaiData = useMemo(() => {
    return theoTrangThai
      .filter((t) => t.so_luong > 0)
      .map((t) => ({
        name: t.nhan,
        value: t.so_luong,
        color: PIE_COLORS[t.ma] || DEFAULT_COLOR,
      }));
  }, [theoTrangThai]);

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      {/* 1. Các thẻ chỉ số thống kê (KPI Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-[var(--radius-control)] border border-slate-200/90 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tổng việc kỳ</span>
            <ListChecks size={15} className="text-slate-600" aria-hidden />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-slate-900">{summary.tong}</span>
            <span className="text-xs text-slate-400">phiếu</span>
          </div>
        </div>

        <div className="rounded-[var(--radius-control)] border border-sky-200/90 bg-sky-50/50 p-3 shadow-sm">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-medium">Đang thực hiện</span>
            <Clock size={15} className="text-sky-600" aria-hidden />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-sky-800">{summary.mo}</span>
            <span className="text-xs text-sky-600">việc mở</span>
          </div>
        </div>

        <div className="rounded-[var(--radius-control)] border border-emerald-200/90 bg-emerald-50/50 p-3 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-medium">Đã hoàn thành</span>
            <CheckCircle2 size={15} className="text-emerald-600" aria-hidden />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-emerald-800">{summary.hoanThanh}</span>
            {summary.pctHoanThanh != null ? (
              <span className="text-xs font-semibold text-emerald-700">({summary.pctHoanThanh}%)</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-[var(--radius-control)] border border-red-200/90 bg-red-50/50 p-3 shadow-sm">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-medium">Quá hạn</span>
            <AlertTriangle size={15} className="text-red-600" aria-hidden />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-red-800">{summary.quaHan}</span>
            {summary.pctQuaHan != null ? (
              <span className="text-xs font-semibold text-red-700">({summary.pctQuaHan}%)</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-[var(--radius-control)] border border-indigo-200/90 bg-indigo-50/50 p-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-xs font-medium">Đúng hạn</span>
            <Award size={15} className="text-indigo-600" aria-hidden />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums text-indigo-800">{summary.dungHan}</span>
            {summary.pctDungHan != null ? (
              <span className="text-xs font-semibold text-indigo-700">({summary.pctDungHan}%)</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 2. Hai biểu đồ trực quan */}
      <div className="grid grid-cols-1 gap-[var(--bv103-space-3)] lg:grid-cols-2">
        {/* Biểu đồ phân bổ công việc theo nhân sự */}
        <div className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">
              Tải công việc theo nhân sự {chartNhanSuData.length < theoNguoi.length ? "(Top 10)" : ""}
            </h3>
            <span className="text-xs text-slate-500">Người phụ trách</span>
          </div>

          {chartNhanSuData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu nhân sự trong kỳ.
            </div>
          ) : (
            <div className="h-64 w-full min-w-0">
              <Bv103ResponsiveChart className="h-full w-full">
                <BarChart data={chartNhanSuData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                    iconType="circle"
                  />
                  <Bar dataKey="Đang mở" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Quá hạn" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </Bv103ResponsiveChart>
            </div>
          )}
        </div>

        {/* Biểu đồ phân bổ trạng thái công việc */}
        <div className="rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Cơ cấu trạng thái công việc</h3>
            <span className="text-xs text-slate-500">Tỷ lệ theo mã trạng thái</span>
          </div>

          {pieTrangThaiData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu trạng thái trong kỳ.
            </div>
          ) : (
            <div className="h-64 w-full min-w-0">
              <Bv103ResponsiveChart className="h-full w-full">
                <PieChart>
                  <Pie
                    data={pieTrangThaiData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieTrangThaiData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    iconType="circle"
                  />
                </PieChart>
              </Bv103ResponsiveChart>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
