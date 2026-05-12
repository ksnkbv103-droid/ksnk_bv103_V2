"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { Activity, Layers, PieChart, ShieldCheck, Warehouse } from "lucide-react";
import type { NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";

type NkbvDashboardPanelProps = {
  payload: NkbvDashboardPayload | null;
  loading?: boolean;
  tuNgay: string;
  denNgay: string;
  onTuNgayChange: (v: string) => void;
  onDenNgayChange: (v: string) => void;
  onApplyRange: () => void;
};

const COL_LOAI = ["#026f17", "#0d9488", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#64748b"];

export default function NkbvDashboardPanel({
  payload,
  loading,
  tuNgay,
  denNgay,
  onTuNgayChange,
  onDenNgayChange,
  onApplyRange,
}: NkbvDashboardPanelProps) {
  const k = payload?.kpis;

  return (
    <div className="space-y-6 px-4 pb-10 animate-in fade-in duration-400">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-400">
          Từ ngày
          <input
            type="date"
            value={tuNgay}
            onChange={(e) => onTuNgayChange(e.target.value)}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-400">
          Đến ngày
          <input
            type="date"
            value={denNgay}
            onChange={(e) => onDenNgayChange(e.target.value)}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold"
          />
        </label>
        <button
          type="button"
          onClick={onApplyRange}
          className="rounded-full bg-[#026f17] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md"
        >
          Cập nhật số liệu
        </button>
        <p className="pb-2 text-[11px] text-slate-500">
          Mặc định: 12 tháng lịch gần nhất theo đến ngày. Chỉ tính phiếu trong khoảng và có ngày phát hiện.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            icon: Layers,
            label: "Phiếu trong khoảng",
            value: loading ? "…" : String(k?.tong_phieu ?? 0),
            sub: `${payload?.tu_ngay} → ${payload?.den_ngay}`,
            tint: "border-l-[#026f17]",
          },
          {
            icon: ShieldCheck,
            label: "Đã xác nhận NKBV",
            value: loading ? "…" : String(k?.da_xac_nhan ?? 0),
            sub:
              loading || !k
                ? ""
                : `Tỷ lệ/XN vs (PA−Loại trừ): ${k.ti_le_xac_nhan_so_voi_pa ?? 0}%`,
            tint: "border-l-emerald-600",
          },
          {
            icon: Activity,
            label: "Đang ghi / Chờ XN",
            value: loading ? "…" : String(k?.dang_va_cho_xn ?? 0),
            sub: "",
            tint: "border-l-amber-500",
          },
          {
            icon: PieChart,
            label: "Loại trừ",
            value: loading ? "…" : String(k?.loai_tru ?? 0),
            sub: "",
            tint: "border-l-slate-500",
          },
          {
            icon: Warehouse,
            label: "Đã đóng",
            value: loading ? "…" : String(k?.da_dong ?? 0),
            sub: "",
            tint: "border-l-blue-600",
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`premium-card rounded-3xl border border-slate-100 bg-white p-5 shadow-[var(--shadow-app-soft)] border-l-4 ${c.tint}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
              <c.icon className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums text-slate-800">{c.value}</p>
            {c.sub ? <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-400">{c.sub}</p> : null}
          </div>
        ))}
      </div>

      {!payload && loading ? (
        <div className="flex h-56 items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm font-medium text-slate-400">Đang tổng hợp…</p>
        </div>
      ) : payload ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Xu hướng phiếu theo tháng
              </h3>
              <div className="h-[280px] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payload.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 18px 24px rgba(0,0,0,.08)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="so_phieu"
                      name="Số phiếu"
                      stroke="#026f17"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#026f17" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Phân bố theo loại HAI/NKBV
              </h3>
              <div className="h-[280px] w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={payload.by_loai.slice(0, 8)} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="ten" width={120} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" name="Phiếu" radius={[0, 10, 10, 0]} barSize={22}>
                      {payload.by_loai.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COL_LOAI[i % COL_LOAI.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Theo trạng thái xử lý
              </h3>
              <div className="h-[260px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.by_trang_thai}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="ten" interval={0} angle={-12} height={72} tick={{ fill: "#64748b", fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#475569" name="Phiếu" radius={[12, 12, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Khoa có nhiều phiếu (top trong khoảng)
              </h3>
              <div className="h-[260px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={payload.top_khoa} margin={{ left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="ten_khoa" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] font-medium italic text-slate-400">
            Mật độ NKBV theo đầu giường / ngày điều trị cần số điều tra dân số từ HIS — chỉ báo KPI trên chỉ là số phiếu đếm trong BV103 MVP.
          </p>
        </>
      ) : (
        <p className="text-center text-sm text-slate-500">
          Chưa tải được thống kê hoặc không có phiếu trong khoảng và bộ lọc khoa đã chọn.
        </p>
      )}
    </div>
  );
}
