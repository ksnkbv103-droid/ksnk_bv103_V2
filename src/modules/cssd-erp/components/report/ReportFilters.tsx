// src/modules/cssd-erp/components/report/ReportFilters.tsx
"use client";

import React from "react";
import { Filter, Calendar } from "lucide-react";

interface Props {
  filters: any;
  setFilters: (f: any) => void;
  stations: string[];
}

/**
 * Bộ lọc báo cáo CSSD (≤ 180 dòng)
 * Hỗ trợ lọc theo thời gian và trạm kiểm soát.
 */
export default function ReportFilters({ filters, setFilters, stations }: Props) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 px-1">
        <div className="bg-[#026f17]/10 p-2 rounded-xl text-[#026f17]"><Filter size={18} /></div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-[#026f17] tracking-widest leading-none">Bộ lọc dữ liệu</span>
          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Tối ưu hóa báo cáo chi tiết</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Từ ngày</label>
          <div className="relative">
            <input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="w-full h-14 pl-5 pr-10 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm outline-none focus:border-[#026f17] transition-all" />
            <Calendar className="absolute right-4 top-4 text-slate-300 pointer-events-none" size={18} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Đến ngày</label>
          <div className="relative">
            <input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="w-full h-14 pl-5 pr-10 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm outline-none focus:border-[#026f17] transition-all" />
            <Calendar className="absolute right-4 top-4 text-slate-300 pointer-events-none" size={18} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Khu vực / Trạm</label>
          <select value={filters.station} onChange={e => setFilters({...filters, station: e.target.value})} className="w-full h-14 px-5 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-sm outline-none focus:border-[#026f17] transition-all appearance-none">
            <option value="ALL">Tất cả các trạm</option>
            {stations.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
