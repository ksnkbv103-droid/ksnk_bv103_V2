"use client";

import React from "react";
import { Plus } from "lucide-react";
import { ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
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
  onFileSelected: (file: File) => void;
};

export default function TieuChiTableToolbar({
  fileInputRef,
  isImporting,
  allowImport,
  allowCreate,
  onExportTemplate,
  onAdd,
  onFileSelected,
}: TieuChiTableToolbarProps) {
  return (
    <div className={C.pageToolbar}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <span className={bv103LayoutChrome.labelBlockAccent}>Tiêu chí chi tiết</span>
        <ImportExportToolbar
          fileInputRef={fileInputRef}
          isImporting={isImporting}
          onExport={onExportTemplate}
          onImportClick={() => fileInputRef.current?.click()}
          onFileChange={onFileSelected}
          showImport={allowImport}
          exportClassName={TC.ctaExport}
          importClassName={TC.ctaImport}
        />
      </div>
      {allowCreate ? (
        <button type="button" onClick={onAdd} className={TC.ctaPrimary}>
          <Plus className="w-3 h-3" /> Thêm tiêu chí
        </button>
      ) : null}
    </div>
  );
}
