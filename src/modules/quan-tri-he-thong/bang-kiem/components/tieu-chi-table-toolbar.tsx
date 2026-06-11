"use client";

import React from "react";
import { Plus, Download, Upload } from "lucide-react";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";
import { quanTriTableChrome as TC } from "../../lib/quan-tri-table-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

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
    <div className={C.pageToolbar}>
      <div className="flex items-center gap-3">
        <span className={bv103LayoutChrome.labelBlockAccent}>Tiêu chí chi tiết</span>
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
        <button type="button" onClick={onAdd} className={TC.ctaPrimary}>
          <Plus className="w-3 h-3" /> Thêm tiêu chí
        </button>
      ) : null}
    </div>
  );
}
