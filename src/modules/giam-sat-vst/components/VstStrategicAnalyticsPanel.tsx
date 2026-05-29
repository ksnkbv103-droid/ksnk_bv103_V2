"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  BarChart2,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import type { VstStrategicPayload } from "../types/vst-strategic.types";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#f97316"];

type FilterProps = {
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  bangKiemOptions: { id: string; label: string }[];
  selectedBangKiemMas: string[];
  setSelectedBangKiemMas: (v: string[]) => void;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  setSelectedKhoiIds: (v: string[]) => void;
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  setSelectedNgheIds: (v: string[]) => void;
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  setSelectedKhuVucIds: (v: string[]) => void;
  selectedHinhThucIds: string[];
  setSelectedHinhThucIds: (v: string[]) => void;
};

type Props = FilterProps & {
  payload: VstStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
};

export default function VstStrategicAnalyticsPanel(p: Props) {
  const sortedGap = useMemo(
    () => [...(p.payload?.gap_analysis || [])].sort((a, b) => (b.ty_le_tgs ?? b.ty_le_ksnk ?? 0) - (a.ty_le_tgs ?? a.ty_le_ksnk ?? 0)),
    [p.payload?.gap_analysis],
  );
  const pieNgheData = useMemo(
    () => (p.payload?.matrix_nghe || []).map((n) => ({ name: n.ten, value: n.tong_co_hoi, ty_le: n.ty_le_tuan_thu })),
    [p.payload?.matrix_nghe],
  );

  return (
    <div className="space-y-6 px-2 pb-8">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4">
        <AnalyticsFilterBar
          tuNgay={p.tuNgay}
          setTuNgay={p.setTuNgay}
          denNgay={p.denNgay}
          setDenNgay={p.setDenNgay}
          bangKiemOptions={p.bangKiemOptions}
          selectedBangKiemMas={p.selectedBangKiemMas}
          setSelectedBangKiemMas={p.setSelectedBangKiemMas}
          khoiOptions={p.khoiOptions}
          selectedKhoiIds={p.selectedKhoiIds}
          setSelectedKhoiIds={p.setSelectedKhoiIds}
          khoaOptions={p.khoaOptions}
          selectedKhoaIds={p.selectedKhoaIds}
          setSelectedKhoaIds={p.setSelectedKhoaIds}
          ngheOptions={p.ngheOptions}
          selectedNgheIds={p.selectedNgheIds}
          setSelectedNgheIds={p.setSelectedNgheIds}
          khuVucOptions={p.khuVucOptions}
          selectedKhuVucIds={p.selectedKhuVucIds}
          setSelectedKhuVucIds={p.setSelectedKhuVucIds}
          selectedHinhThucIds={p.selectedHinhThucIds}
          setSelectedHinhThucIds={p.setSelectedHinhThucIds}
        />
      </div>

      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">Tỷ lệ tuân thủ</p>
          <p className="mt-2 text-4xl font-black">{p.payload?.kpis?.ty_le_tuan_thu ?? 0}%</p>
        </div>
        {[
          { label: "Đúng kỹ thuật", value: p.payload?.kpis?.ty_le_dung_ky_thuat ?? 0 },
          { label: "Đủ thời gian", value: p.payload?.kpis?.ty_le_du_thoi_gian ?? 0 },
          { label: "Lạm dụng găng", value: p.payload?.kpis?.ty_le_lam_dung_gang ?? 0, warn: true },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase text-slate-400">{k.label}</p>
            <p className={`mt-2 text-3xl font-black ${k.warn ? "text-red-600" : "text-slate-800"}`}>
              {p.loading ? "…" : `${k.value}%`}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <TrendingUp size={18} className="text-emerald-600" /> Xu hướng tuân thủ
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p.payload?.trendline || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="ty_le_tuan_thu" stroke="#10b981" strokeWidth={3} name="Tuân thủ (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-800">5 Thời điểm WHO</h3>
          <div className="h-[280px]">
            {(p.payload?.moments || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={p.payload?.moments.map((m) => ({ ...m, ty_le_khong: 100 - m.ty_le_tuan_thu })) || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="ten" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar name="Tuân thủ" dataKey="ty_le_tuan_thu" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {pieNgheData.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-slate-800">Tuân thủ theo đối tượng</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieNgheData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {pieNgheData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {sortedGap.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
            <BarChart2 size={18} className="text-indigo-500" /> Đối soát TGS vs KSNK
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedGap}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="ty_le_tgs" name="Tự GS (%)" fill="#fbbf24" />
                <Bar dataKey="ty_le_ksnk" name="KSNK (%)" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VstAnalyticsDeepLinkHint() {
  return (
    <Link
      href="/giam-sat-vst"
      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
    >
      Xem chi tiết tại module VST <ExternalLink size={12} />
    </Link>
  );
}
