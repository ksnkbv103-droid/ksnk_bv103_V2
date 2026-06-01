"use client";

import { CheckCircle2, FileText } from "lucide-react";
import type { DashboardV4Payload } from "../../strategic-dashboard-v4.types";

type Props = {
  summary: DashboardV4Payload["summary"];
  loading?: boolean;
};

export function GscDashboardSummaryCards({ summary, loading }: Props) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
          <FileText size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng phiên giám sát</p>
          <p className="text-3xl font-black text-slate-800">{summary.tong_so_phien}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl bg-emerald-50 p-3 text-[#026f17]">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tỷ lệ tuân thủ chung</p>
          <p className="text-3xl font-black text-[#026f17]">{summary.ty_le_tuan_thu_chung}%</p>
        </div>
      </div>
    </div>
  );
}
