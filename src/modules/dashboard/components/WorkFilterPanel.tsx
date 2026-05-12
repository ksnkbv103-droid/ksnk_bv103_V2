"use client";

import React from "react";
import SearchableMultiSelect, { type MultiSelectOption } from "@/components/shared/SearchableMultiSelect";

type WorkFilterPanelProps = {
  khoaOptions: MultiSelectOption[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  onRefresh: () => void;
};

export default function WorkFilterPanel({
  khoaOptions,
  selectedKhoaIds,
  setSelectedKhoaIds,
  tuNgay,
  setTuNgay,
  denNgay,
  setDenNgay,
  onRefresh,
}: WorkFilterPanelProps) {
  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="w-64">
        <SearchableMultiSelect 
          label="Khoa / Phòng" 
          options={khoaOptions} 
          selected={selectedKhoaIds} 
          onChange={setSelectedKhoaIds} 
        />
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          value={tuNgay} 
          onChange={(e) => setTuNgay(e.target.value)} 
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-500" 
        />
        <span className="text-slate-400 text-xs font-bold">→</span>
        <input 
          type="date" 
          value={denNgay} 
          onChange={(e) => setDenNgay(e.target.value)} 
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-500" 
        />
      </div>
      <button 
        type="button" 
        onClick={onRefresh} 
        className="h-11 rounded-xl bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-blue-700 transition-all"
      >
        Lọc dữ liệu
      </button>
    </div>
  );
}
