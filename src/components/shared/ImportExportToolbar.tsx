"use client";

import type { RefObject } from "react";
import { Download, Loader2, Upload } from "lucide-react";

/** Nhãn toolbar Excel chuẩn BV103 (người dùng phổ thông). */
export const IMPORT_EXPORT_LABELS = {
  downloadTemplate: "Tải file mẫu",
  importExcel: "Nạp Excel",
  importing: "Đang nạp…",
} as const;

type HintProps = {
  className?: string;
  /** Fact vận hành: không nhắc «Đồng bộ đầy đủ». */
  disableSyncFull?: boolean;
};

/** Hướng dẫn 3 bước — đặt gần nút Import/Export. */
export function ImportExportHint({ className, disableSyncFull }: HintProps) {
  return (
    <ol
      className={
        className ??
        "list-decimal list-inside space-y-0.5 text-[11px] leading-relaxed text-slate-500"
      }
    >
      <li>
        Bấm <strong className="font-semibold text-slate-700">{IMPORT_EXPORT_LABELS.downloadTemplate}</strong> — giữ
        nguyên dòng tiêu đề.
      </li>
      <li>
        Sửa / thêm dòng trong Excel — giữ <strong className="font-semibold text-slate-700">mã</strong> khi muốn cập
        nhật; để trống mã khi thêm mới (nếu màn hỗ trợ).
      </li>
      <li>
        Bấm <strong className="font-semibold text-slate-700">{IMPORT_EXPORT_LABELS.importExcel}</strong> → xem trước →
        {disableSyncFull ? (
          <> chọn thêm/cập nhật an toàn.</>
        ) : (
          <> chọn An toàn hoặc Đồng bộ đầy đủ (ẩn bản ghi thiếu — không xóa).</>
        )}
      </li>
    </ol>
  );
}

type ToolbarProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  onExport: () => void;
  onImportClick: () => void;
  onFileChange: (file: File) => void;
  showImport?: boolean;
  showExport?: boolean;
  showHint?: boolean;
  disableSyncFull?: boolean;
  exportClassName?: string;
  importClassName?: string;
  className?: string;
  actionsClassName?: string;
};

/**
 * Toolbar Excel dùng chung: Tải file mẫu + Nạp Excel + input ẩn.
 * Mỗi trang truyền class nút theo chrome module (MDM / CSSD / …).
 */
export function ImportExportToolbar({
  fileInputRef,
  isImporting,
  onExport,
  onImportClick,
  onFileChange,
  showImport = true,
  showExport = true,
  showHint = false,
  disableSyncFull,
  exportClassName,
  importClassName,
  className,
  actionsClassName,
}: ToolbarProps) {
  return (
    <div className={className ?? "flex flex-col gap-2"}>
      {showHint ? <ImportExportHint disableSyncFull={disableSyncFull} /> : null}
      <div className={actionsClassName ?? "flex flex-wrap items-center gap-2"}>
        {showExport ? (
          <button type="button" onClick={onExport} className={exportClassName}>
            <Download size={14} aria-hidden /> {IMPORT_EXPORT_LABELS.downloadTemplate}
          </button>
        ) : null}
        {showImport ? (
          <>
            <button
              type="button"
              onClick={onImportClick}
              disabled={isImporting}
              className={importClassName}
            >
              {isImporting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Upload size={14} aria-hidden />
              )}
              {isImporting ? IMPORT_EXPORT_LABELS.importing : IMPORT_EXPORT_LABELS.importExcel}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileChange(file);
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
