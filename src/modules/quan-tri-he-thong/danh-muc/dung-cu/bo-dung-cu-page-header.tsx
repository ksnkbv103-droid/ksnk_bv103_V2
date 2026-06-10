"use client";

import React from "react";
import { Plus, Database, Download, Upload, Loader2 } from "lucide-react";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

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
    <>
      <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".xlsx, .xls" className="hidden" />
      <KsnkListPageHeader
        icon={Database}
        title="Bộ dụng cụ"
        eyebrow="Danh mục master · Bộ dụng cụ CSSD"
        actions={
          <>
            <button type="button" onClick={onTriggerImport} disabled={isImporting} className={C.ctaAmber}>
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import dữ liệu
            </button>
            <button type="button" onClick={onExportTemplate} className={C.ctaMuted}>
              <Download size={16} /> Export dữ liệu mẫu
            </button>
            <button type="button" onClick={onCreate} className={C.ctaPrimary}>
              <Plus size={18} /> Thêm mới
            </button>
          </>
        }
      />
    </>
  );
}
