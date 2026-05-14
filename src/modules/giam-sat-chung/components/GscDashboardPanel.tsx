"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Activity, ShieldCheck, Target, TrendingUp, ClipboardList } from "lucide-react";
import type { GscDashboardPayload } from "../actions/giam-sat-chung-dashboard.types";

const GscDashboardPanelCharts = dynamic(() => import("./GscDashboardPanelCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="h-[320px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50/80" />
      <div className="h-[320px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50/80" />
    </div>
  ),
});

type Props = {
  payload: GscDashboardPayload | null;
  loading?: boolean;
  tuNgay: string;
  denNgay: string;
  onTuNgayChange: (v: string) => void;
  onDenNgayChange: (v: string) => void;
  onApplyRange: () => void;
};

export default function GscDashboardPanel({ payload, loading, tuNgay, denNgay, onTuNgayChange, onDenNgayChange, onApplyRange }: Props) {
  const k = payload?.kpis;
  return (
    <div className="space-y-6 px-2 pb-8">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/90 bg-white p-4">
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-400">Từ ngày
          <input type="date" value={tuNgay} onChange={(e) => onTuNgayChange(e.target.value)} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold" />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-400">Đến ngày
          <input type="date" value={denNgay} onChange={(e) => onDenNgayChange(e.target.value)} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold" />
        </label>
        <button type="button" onClick={onApplyRange} className="rounded-full bg-[#026f17] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">Cập nhật số liệu</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { icon: ClipboardList, label: "Phiên giám sát", value: String(k?.tong_phien ?? 0) },
          { icon: Target, label: "Điểm TB", value: String(k?.diem_tb ?? 0) },
          { icon: ShieldCheck, label: "Đạt chuẩn (>=90)", value: String(k?.dat_chuan_90 ?? 0) },
          { icon: TrendingUp, label: "Dưới chuẩn", value: String(k?.duoi_chuan_90 ?? 0) },
          { icon: Activity, label: "Tỷ lệ đạt tiêu chí", value: `${k?.ty_le_dat_tieu_chi ?? 0}%` },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase text-slate-400">{x.label}</p><x.icon className="h-4 w-4 text-slate-300" /></div>
            <p className="mt-2 text-2xl font-black text-slate-800">{loading ? "…" : x.value}</p>
          </div>
        ))}
      </div>

      {payload ? (
        <GscDashboardPanelCharts monthly={payload.monthly} by_loai_bang_kiem={payload.by_loai_bang_kiem} />
      ) : (
        <div className="text-center text-sm text-slate-500">{loading ? "Đang tổng hợp..." : "Không có dữ liệu trong khoảng chọn."}</div>
      )}
    </div>
  );
}
