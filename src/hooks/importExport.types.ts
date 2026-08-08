"use client";

export type ImportRow = Record<string, unknown>;

/** Tùy chọn import sau khi user chọn chế độ trên dialog. */
export type ImportOptions = {
  /** true = tắt bản ghi thiếu trong file; false = Import an toàn. */
  softDeleteMissing?: boolean;
  /** true = chỉ chuẩn bị/đếm, không ghi DB (nếu server hỗ trợ). */
  dryRun?: boolean;
};

export type ImportResult = {
  success: boolean;
  error?: string;
  warning?: string;
  dryRun?: boolean;
  /** Lỗi dòng (parse/validate) — hiện trên dialog P4 khi dry-run. */
  errorLines?: string[];
  errorTotal?: number;
  audit?: {
    insertCount: number;
    updateCount: number;
    deactivateCount: number;
  };
};

export interface ImportExportConfig {
  moduleKey: string;
  tableName: string;
  displayName: string;
  uniqueKey: string;
  isHierarchical?: boolean;
  childUniqueKey?: string;
  childForeignKey?: string;
  childArrayKey?: string;
  /** Khi true: không cho «Đồng bộ đầy đủ» (fact vận hành). */
  disableSyncFull?: boolean;
  columnMapping: Record<string, string>;
  onImport: (data: ImportRow[], options?: ImportOptions) => Promise<ImportResult>;
  onGetData?: () => Promise<{ success: boolean; data?: ImportRow[] }>;
  onSuccess?: () => void;
  dataValidations?: Record<string, string[]>;
}
