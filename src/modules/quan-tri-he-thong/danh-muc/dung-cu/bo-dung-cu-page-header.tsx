"use client";

import React from "react";
import { Plus, Database } from "lucide-react";
import { KsnkListPageHeader } from "@/components/shared/KsnkPageShell";
import { ImportExportHint, ImportExportToolbar } from "@/components/shared/ImportExportToolbar";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

type Props = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => void;
  isImporting: boolean;
  onTriggerImport: () => void;
  onExportTemplate: () => void;
  onCreate: () => void;
};

export function BoDungCuPageHeader({
  fileInputRef,
  onFileSelected,
  isImporting,
  onTriggerImport,
  onExportTemplate,
  onCreate,
}: Props) {
  return (
    <>
      <KsnkListPageHeader
        icon={Database}
        title="Bộ dụng cụ"
        eyebrow="Danh mục master · Bộ dụng cụ CSSD"
        actions={
          <>
            <ImportExportToolbar
              fileInputRef={fileInputRef}
              isImporting={isImporting}
              onExport={onExportTemplate}
              onImportClick={onTriggerImport}
              onFileChange={onFileSelected}
              exportClassName={C.ctaMuted}
              importClassName={C.ctaAmber}
            />
            <button type="button" onClick={onCreate} className={C.ctaPrimary}>
              <Plus size={18} /> Thêm mới
            </button>
          </>
        }
      />
      <ImportExportHint />
    </>
  );
}
