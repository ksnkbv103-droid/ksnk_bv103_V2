// src/hooks/useImportExport.ts
"use client";

import { useMemo } from "react";
import { useExcelExport } from "./useExcelExport";
import { useExcelImport } from "./useExcelImport";
import type { ImportExportConfig, ImportRow } from "./importExport.types";

export type { ImportRow, ImportExportConfig };

export function useImportExport(config: ImportExportConfig) {
  const normalizedMapping = useMemo(() => {
    const next = { ...config.columnMapping };
    if (!next.is_active) next.is_active = "is_active";
    return next;
  }, [config.columnMapping]);

  const { exportTemplate } = useExcelExport(config, normalizedMapping);
  const { handleFileUpload, isImporting, triggerImport, fileInputRef } = useExcelImport(config, normalizedMapping);

  return { exportTemplate, handleFileUpload, isImporting, triggerImport, fileInputRef };
}
