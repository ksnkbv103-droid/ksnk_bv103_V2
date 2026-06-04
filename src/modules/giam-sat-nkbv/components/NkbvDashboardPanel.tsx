"use client";

import React from "react";
import {
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
import { Bv103ResponsiveChart } from "@/components/charts/Bv103ResponsiveChart";
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
        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          <p className="text-sm font-medium text-slate-400">Đang tổng hợp…</p>
        </div>
      ) : payload ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Xu hướng phiếu theo tháng
              </h3>
              <Bv103ResponsiveChart className="h-[280px] w-full min-h-[260px] min-w-0">
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
              </Bv103ResponsiveChart>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Phân bố theo loại HAI/NKBV
              </h3>
              <Bv103ResponsiveChart className="h-[280px] w-full min-h-[260px] min-w-0">
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
              </Bv103ResponsiveChart>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Theo trạng thái xử lý
              </h3>
              <Bv103ResponsiveChart className="h-[260px] w-full min-h-[240px] min-w-0">
                  <BarChart data={payload.by_trang_thai}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="ten" interval={0} angle={-12} height={72} tick={{ fill: "#64748b", fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#475569" name="Phiếu" radius={[12, 12, 0, 0]} barSize={28} />
                  </BarChart>
              </Bv103ResponsiveChart>
            </div>

            <div className="premium-card rounded-[36px] border border-slate-50 bg-white p-6 shadow-xl shadow-slate-200/40">
              <h3 className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-700">
                Khoa có nhiều phiếu (top trong khoảng)
              </h3>
              <Bv103ResponsiveChart className="h-[260px] w-full min-h-[240px] min-w-0">
                  <BarChart layout="vertical" data={payload.top_khoa} margin={{ left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="ten_khoa" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="so_phieu" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20} />
                  </BarChart>
              </Bv103ResponsiveChart>
            </div>
          </div>

          {/* Premium JCI / CDC NHSN Epidemiology Surveillance Dashboard */}
          {payload.epidemiologyRates && payload.epidemiologyRates.length > 0 && (
            <div className="premium-card rounded-[36px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#026f17]" />
                    Chỉ số Dịch tễ học Lâm sàng & Kiểm soát rủi ro JCI (NHSN/CDC 2023)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phân tích tỷ suất nhiễm khuẩn và sử dụng thiết bị xâm lấn chuẩn hóa theo thời gian thực (DUR, SIR, SUR) không qua tổng hợp tĩnh.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase text-slate-400 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                  <span className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm">DUR: Tỷ lệ sử dụng thiết bị</span>
                  <span className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm">SIR: Tỷ số nhiễm khuẩn chuẩn hóa</span>
                  <span className="bg-white text-slate-700 px-3 py-1 rounded-full shadow-sm">SUR: Tỷ số sử dụng thiết bị chuẩn hóa</span>
                </div>
              </div>

              {/* JCI Hospital Aggregates Summary Cards */}
              {(() => {
                const rates = payload.epidemiologyRates || [];
                const totPatientDays = rates.reduce((acc, r) => acc + Number(r.obs_patient_days || 0), 0);
                const totCvcDays = rates.reduce((acc, r) => acc + Number(r.obs_cvc_days || 0), 0);
                const totFoleyDays = rates.reduce((acc, r) => acc + Number(r.obs_foley_days || 0), 0);
                const totVentDays = rates.reduce((acc, r) => acc + Number(r.obs_vent_days || 0), 0);
                const totSurgeries = rates.reduce((acc, r) => acc + Number(r.obs_total_surgeries || 0), 0);
                
                const totClabsi = rates.reduce((acc, r) => acc + Number(r.obs_clabsi_cases || 0), 0);
                const totCauti = rates.reduce((acc, r) => acc + Number(r.obs_cauti_cases || 0), 0);
                const totVap = rates.reduce((acc, r) => acc + Number(r.obs_vap_cases || 0), 0);
                const totSsi = rates.reduce((acc, r) => acc + Number(r.obs_ssi_cases || 0), 0);

                const clabsiRate = totCvcDays > 0 ? ((totClabsi / totCvcDays) * 1000).toFixed(2) : "0.00";
                const cautiRate = totFoleyDays > 0 ? ((totCauti / totFoleyDays) * 1000).toFixed(2) : "0.00";
                const vapRate = totVentDays > 0 ? ((totVap / totVentDays) * 1000).toFixed(2) : "0.00";
                const ssiRate = totSurgeries > 0 ? ((totSsi / totSurgeries) * 100).toFixed(2) : "0.00";

                const cvcDur = totPatientDays > 0 ? (totCvcDays / totPatientDays).toFixed(4) : "0.0000";
                const foleyDur = totPatientDays > 0 ? (totFoleyDays / totPatientDays).toFixed(4) : "0.0000";
                const ventDur = totPatientDays > 0 ? (totVentDays / totPatientDays).toFixed(4) : "0.0000";

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* CLABSI Card */}
                    <div className="premium-card bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Nhiễm khuẩn huyết (CLABSI)</span>
                        <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-bold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black text-slate-800">{totClabsi} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="text-xs font-bold text-red-600">{clabsiRate} <span className="text-[11px] font-normal text-slate-400">/1000 CVC-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-semibold">
                        <div>CVC Days: <strong className="text-slate-700">{totCvcDays}</strong></div>
                        <div>CVC DUR: <strong className="text-slate-700">{cvcDur}</strong></div>
                      </div>
                    </div>

                    {/* CAUTI Card */}
                    <div className="premium-card bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Tiết niệu (CAUTI)</span>
                        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-bold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black text-slate-800">{totCauti} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="text-xs font-bold text-amber-600">{cautiRate} <span className="text-[11px] font-normal text-slate-400">/1000 F-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-semibold">
                        <div>Foley Days: <strong className="text-slate-700">{totFoleyDays}</strong></div>
                        <div>Foley DUR: <strong className="text-slate-700">{foleyDur}</strong></div>
                      </div>
                    </div>

                    {/* VAP Card */}
                    <div className="premium-card bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-teal-500 tracking-wider">Viêm phổi máy (VAP)</span>
                        <span className="rounded-full bg-teal-100 text-teal-700 px-2 py-0.5 text-[11px] font-bold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black text-slate-800">{totVap} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="text-xs font-bold text-teal-600">{vapRate} <span className="text-[11px] font-normal text-slate-400">/1000 V-days</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-semibold">
                        <div>Vent Days: <strong className="text-slate-700">{totVentDays}</strong></div>
                        <div>Vent DUR: <strong className="text-slate-700">{ventDur}</strong></div>
                      </div>
                    </div>

                    {/* SSI Card */}
                    <div className="premium-card bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-3xl p-4 space-y-2 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Vết mổ (SSI)</span>
                        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[11px] font-bold">JCI Site</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black text-slate-800">{totSsi} <span className="text-xs font-normal text-slate-400">ca</span></span>
                        <span className="text-xs font-bold text-blue-600">{ssiRate}% <span className="text-[11px] font-normal text-slate-400">tỷ lệ mổ</span></span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-semibold">
                        <div>Số ca mổ: <strong className="text-slate-700">{totSurgeries}</strong></div>
                        <div>Ngày nằm: <strong className="text-slate-700">{totPatientDays}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* JCI Detailed Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full min-w-[900px] border-collapse text-left text-xs font-medium text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 w-44">Khoa lâm sàng</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CLABSI / CVC Days</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CVC DUR</th>
                      <th className="px-4 py-3 text-center bg-red-50/30 text-red-700">CLABSI SIR</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">CAUTI / Foley Days</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">Foley DUR</th>
                      <th className="px-4 py-3 text-center bg-amber-50/30 text-amber-700">CAUTI SIR</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">VAP / Vent Days</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">Vent DUR</th>
                      <th className="px-4 py-3 text-center bg-teal-50/30 text-teal-700">VAP/VAE SIR</th>
                      <th className="px-4 py-3 text-center bg-blue-50/30 text-blue-700">SSI / Mổ</th>
                      <th className="px-4 py-3 text-center bg-blue-50/30 text-blue-700">SSI SIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.epidemiologyRates.map((r: any) => {
                      const hasClabsiSir = Number(r.clabsi_sir || 0) > 0;
                      const hasCautiSir = Number(r.cauti_sir || 0) > 0;
                      const hasVaeSir = Number(r.vae_sir || 0) > 0;
                      const hasSsiSir = Number(r.ssi_sir || 0) > 0;

                      return (
                        <tr key={r.khoa_id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">{r.ten_khoa}</td>
                          
                          {/* CLABSI columns */}
                          <td className="px-4 py-3 text-center bg-red-50/10">
                            <span className="font-bold text-slate-900">{r.obs_clabsi_cases || 0}</span>
                            <span className="text-slate-400"> / {r.obs_cvc_days || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-red-50/10 font-mono">
                            {(Number(r.cvc_dur) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-center bg-red-50/10">
                            {hasClabsiSir ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                Number(r.clabsi_sir) > 1.0 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {Number(r.clabsi_sir).toFixed(2)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>

                          {/* CAUTI columns */}
                          <td className="px-4 py-3 text-center bg-amber-50/10">
                            <span className="font-bold text-slate-900">{r.obs_cauti_cases || 0}</span>
                            <span className="text-slate-400"> / {r.obs_foley_days || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-amber-50/10 font-mono">
                            {(Number(r.foley_dur) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-center bg-amber-50/10">
                            {hasCautiSir ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                Number(r.cauti_sir) > 1.0 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {Number(r.cauti_sir).toFixed(2)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>

                          {/* VAP columns */}
                          <td className="px-4 py-3 text-center bg-teal-50/10">
                            <span className="font-bold text-slate-900">{r.obs_vap_cases || 0}</span>
                            <span className="text-slate-400"> / {r.obs_vent_days || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-teal-50/10 font-mono">
                            {(Number(r.vent_dur) * 100).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-center bg-teal-50/10">
                            {hasVaeSir ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                Number(r.vae_sir) > 1.0 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {Number(r.vae_sir).toFixed(2)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>

                          {/* SSI columns */}
                          <td className="px-4 py-3 text-center bg-blue-50/10">
                            <span className="font-bold text-slate-900">{r.obs_ssi_cases || 0}</span>
                            <span className="text-slate-400"> / {r.obs_total_surgeries || 0}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-50/10">
                            {hasSsiSir ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                Number(r.ssi_sir) > 1.0 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {Number(r.ssi_sir).toFixed(2)}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] font-medium italic text-slate-400">
            * Mật độ JCI được tính theo ngày nằm viện thực tế thu thập từ Mẫu Số hàng ngày. SIR và SUR được chuẩn hóa đối chiếu với baselines CDC/NHSN 2023.
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
