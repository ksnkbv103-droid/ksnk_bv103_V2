"use client";

import React from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import type { NhanSu } from "../../types";

interface NhanSuToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  khoaFilter: string;
  onKhoaFilterChange: (value: string) => void;
  khoas: { id: string; ten_danh_muc: string }[];
  loading: boolean;
  onRefresh: () => void;
  onAdd: () => void;
}

/**
 * NhanSuToolbar - Thanh công cụ tìm kiếm, bộ lọc và nút hành động cho bảng Nhân sự
 */
export default function NhanSuToolbar({
  search, onSearchChange, khoaFilter, onKhoaFilterChange, khoas,
  loading, onRefresh, onAdd,
  exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef, data
}: NhanSuToolbarProps & {
  exportTemplate: (data?: NhanSu[]) => Promise<void>;
  handleFileUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  isImporting: boolean;
  triggerImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  data: NhanSu[];
}) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
      <div className="space-y-4 w-full xl:w-auto">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-[#026f17] rounded-full" />
          <h3 className="text-2xl font-black text-[#026f17] uppercase tracking-tight">Hồ sơ Nhân sự Bệnh viện</h3>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className={`p-2 rounded-xl transition-all ${loading ? 'animate-spin opacity-50' : 'hover:bg-slate-100 text-slate-400 hover:text-[#026f17]'}`}
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="relative group">
            <input
              className="input pl-12 w-full md:w-72 bg-slate-50 border-slate-100 hover:border-[#026f17] focus:bg-white"
              placeholder="Tìm Mã NV hoặc Tên..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#026f17] transition-colors" />
          </div>
          
          <select
            className="select min-w-[200px] bg-slate-50 border-slate-100 font-bold"
            value={khoaFilter}
            onChange={(e) => onKhoaFilterChange(e.target.value)}
          >
            <option value="Tất cả">Tất cả Khoa / Phòng</option>
            {khoas.map(k => (
              <option key={k.id} value={k.id}>{k.ten_danh_muc}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 w-full md:w-auto">
        <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} accept=".xlsx, .xls" className="hidden" />
        <button
          onClick={triggerImport}
          disabled={isImporting || loading}
          className="flex-1 md:flex-none h-12 px-6 rounded-full bg-amber-50 text-amber-600 font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 active:scale-95"
        >
          {isImporting ? "⏳" : "📥"} Import dữ liệu
        </button>
        <button
          onClick={() => exportTemplate(data)}
          disabled={loading}
          className="flex-1 md:flex-none h-12 px-6 rounded-full bg-slate-50 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95"
        >
          📤 Export dữ liệu mẫu
        </button>
        <button
          onClick={onAdd}
          className="flex-1 md:flex-none h-12 px-8 rounded-full bg-[#026f17] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#026f17]/20 hover:shadow-[#026f17]/40 transition-all flex items-center justify-center gap-2 active:scale-95"
          disabled={loading}
        >
          <Plus className="w-4 h-4" /> Mới
        </button>
      </div>
    </div>
  );
}
