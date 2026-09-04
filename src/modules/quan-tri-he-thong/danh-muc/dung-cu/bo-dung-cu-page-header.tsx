"use client";

import React from "react";
import { Plus } from "lucide-react";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

type Props = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
  isImporting: boolean;
  onTriggerImport: () => void;
  onExportTemplate: () => void;
  onCreate: () => void;
  canWriteMaster?: boolean;
  onOpenLoaiSheet?: () => void;
  loaiFilter?: string;
  loaiFilterOptions?: string[];
  onLoaiFilterChange?: (value: string) => void;
};

export function BoDungCuPageHeader({
  fileInputRef,
  onFileSelected,
  isImporting,
  onTriggerImport,
  onExportTemplate,
  onCreate,
  canWriteMaster = true,
  onOpenLoaiSheet,
  loaiFilter = "",
  loaiFilterOptions = [],
  onLoaiFilterChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {loaiFilterOptions.length > 1 && onLoaiFilterChange ? (
          <select
            value={loaiFilter}
            onChange={(e) => onLoaiFilterChange(e.target.value)}
            className="bv103-control-h rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700"
            aria-label="Lọc theo loại"
          >
            <option value="">Mọi loại</option>
            {loaiFilterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
        {canWriteMaster && onOpenLoaiSheet ? (
          <button type="button" onClick={onOpenLoaiSheet} className="text-[11px] font-semibold text-slate-500 hover:text-[var(--primary)]">
            Loại
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canWriteMaster ? (
          <details className="rounded-[var(--radius-control)] border border-slate-200 bg-white px-2 py-1">
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-500">Excel</summary>
            <div className="pt-2">
              <ImportExportToolbar
                fileInputRef={fileInputRef}
                isImporting={isImporting}
                onExport={onExportTemplate}
                onImportClick={onTriggerImport}
                onFileChange={onFileSelected}
                showImport
                exportClassName={C.ctaMuted}
                importClassName={C.ctaAmber}
              />
            </div>
          </details>
        ) : null}
        {canWriteMaster ? (
          <button type="button" onClick={onCreate} className={C.ctaPrimary}>
            <Plus size={16} /> Thêm bộ
          </button>
        ) : null}
      </div>
    </div>
  );
}
