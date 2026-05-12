"use client";

export type ImportRow = Record<string, unknown>;

export interface ImportExportConfig {
  moduleKey: string;
  tableName: string;
  displayName: string;
  uniqueKey: string;
  isHierarchical?: boolean;
  childUniqueKey?: string;
  childForeignKey?: string;
  childArrayKey?: string;
  columnMapping: Record<string, string>;
  onImport: (data: ImportRow[]) => Promise<{ success: boolean; error?: string; warning?: string }>;
  onGetData?: () => Promise<{ success: boolean; data?: ImportRow[] }>;
  onSuccess?: () => void;
  dataValidations?: Record<string, string[]>;
}
