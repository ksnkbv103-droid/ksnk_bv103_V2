"use client";

import React from "react";
import { Plus, Database, Download, Upload, Loader2 } from "lucide-react";

type Props = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isImporting: boolean;
  onTriggerImport: () => void;
  onExportTemplate: () => void;
  onCreate: () => void;
};

export function BoDungCuPageHeader({
  fileInputRef,
  onFileChange,
  isImporting,
  onTriggerImport,
  onExportTemplate,
  onCreate,
}: Props) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
      <div>
        <h1 className="text-2xl font-black text-[#026f17] uppercase tracking-tighter flex items-center gap-3">
          <Database /> Bộ dụng cụ
        </h1>
        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1 italic leading-none">
          Master cssd_dm_bo_dung_cu
        </p>
      </div>
      <div className="flex gap-3 w-full sm:w-auto">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />
        <button
          type="button"
          onClick={onTriggerImport}
          disabled={isImporting}
          className="h-12 px-5 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 touch-manipulation"
        >
          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu
        </button>
        <button
          type="button"
          onClick={onExportTemplate}
          className="h-12 px-5 bg-slate-50 text-slate-500 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation"
        >
          <Download size={16} /> Export dữ liệu mẫu
        </button>
        <button
          type="button"
          onClick={onCreate}
          className="h-12 px-6 bg-[#026f17] text-[#FFD700] rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 hover:opacity-90 touch-manipulation"
        >
          <Plus size={18} /> Thêm mới
        </button>
      </div>
    </header>
  );
}
