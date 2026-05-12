"use client";

import React from "react";
import { Plus, Download, Upload } from "lucide-react";

type TieuChiTableToolbarProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  allowImport: boolean;
  allowCreate: boolean;
  onExportTemplate: () => void;
  onAdd: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function TieuChiTableToolbar({
  fileInputRef,
  isImporting,
  allowImport,
  allowCreate,
  onExportTemplate,
  onAdd,
  onFileChange,
}: TieuChiTableToolbarProps) {
  return (
    <div className="p-6 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-[#026f17] uppercase tracking-widest">Tiêu chí chi tiết</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExportTemplate}
            className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-all"
            title="Tải template của bảng kiểm này"
          >
            <Download className="w-3 h-3" />
          </button>
          {allowImport ? (
            <>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 bg-amber-50 text-amber-500 rounded-full hover:bg-amber-100 transition-all ${isImporting ? "animate-spin" : ""}`}
                title="Import tiêu chí (file phân cần quyền import cả BK + tiêu chí)"
              >
                <Upload className="w-3 h-3" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={onFileChange} />
            </>
          ) : null}
        </div>
      </div>
      {allowCreate ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#026f17] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 shadow-lg shadow-[#026f17]/20"
        >
          <Plus className="w-3 h-3" /> Thêm
        </button>
      ) : null}
    </div>
  );
}
