"use client";

import { useCallback, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import type { ImportExportConfig, ImportRow } from "./importExport.types";
import {
  buildFullReverseMapping,
  computeScanMaxCol,
  detectHeaderRowNum,
  excelCellToPlain,
  normalizeImportedIsActive,
} from "./importExport.utils";

export function useExcelImport(config: ImportExportConfig, normalizedMapping: Record<string, string>) {
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const technicalFields = new Set(["id", "created_at", "updated_at", "__excel_row__"]);

  const triggerImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsImporting(true);
    const toastId = toast.loading(`Đang xử lý ${file.name}...`);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) throw new Error("File trống");

      const reverseMapping = buildFullReverseMapping({
        tableName: config.tableName,
        uniqueKey: config.uniqueKey,
        normalizedMapping,
      });
      const headerRowNum = detectHeaderRowNum(worksheet, reverseMapping);
      if (headerRowNum === 0) {
        throw new Error("Không nhận dạng được dòng tiêu đề. Dùng file từ nút Export hoặc đặt tên cột giống mẫu hệ thống.");
      }

      const headerRow = worksheet.getRow(headerRowNum);
      const maxCol = computeScanMaxCol(worksheet, headerRowNum);
      const rows: ImportRow[] = [];
      const rowErrors: string[] = [];
      const lastDataRow = worksheet.rowCount || headerRowNum;

      for (let rowNumber = headerRowNum + 1; rowNumber <= lastDataRow; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: ImportRow = {};
        let hasData = false;
        for (let colNumber = 1; colNumber <= maxCol; colNumber++) {
          const header = String(excelCellToPlain(headerRow.getCell(colNumber).value) ?? "").trim().toUpperCase();
          const key = reverseMapping[header];
          if (!key || technicalFields.has(key)) continue;
          const cleaned = excelCellToPlain(row.getCell(colNumber).value);
          if (cleaned !== null && String(cleaned).trim() !== "") {
            hasData = true;
            rowData[key] = cleaned;
          }
        }
        if (!hasData) continue;
        rowData.__excel_row__ = rowNumber;
        rowData.is_active = normalizeImportedIsActive(rowData.is_active);

        if (config.isHierarchical) {
          const hasParentCode = String(rowData[config.uniqueKey] || "").trim() !== "";
          const hasParentName = String(rowData.ten_bang_kiem || "").trim() !== "";
          const hasChildCode = String(rowData[config.childUniqueKey || ""] || "").trim() !== "";
          const hasChildContent = String(rowData.noi_dung || rowData.noi_dung_tieu_chi || "").trim() !== "";
          if (!hasParentCode && !hasParentName) rowErrors.push(`Dòng ${rowNumber}: thiếu mã hoặc tên bảng kiểm.`);
          else if (!hasChildCode && !hasChildContent) rowErrors.push(`Dòng ${rowNumber}: thiếu mã và nội dung tiêu chí.`);
        }

        rows.push(rowData);
      }

      if (rows.length === 0) throw new Error("Không có dữ liệu");
      if (rowErrors.length > 0) throw new Error(`File có lỗi:\n${rowErrors.slice(0, 10).join("\n")}`);

      let finalData = rows;
      if (config.isHierarchical) {
        const groupedMap = new Map<string, ImportRow & { children: ImportRow[] }>();
        let lastGroupKey = "";
        const childKeys = new Set(
          [config.childUniqueKey, "stt", "noi_dung", "noi_dung_tieu_chi", "ghi_chu", "is_active"].filter(Boolean) as string[],
        );

        rows.forEach((row) => {
          const groupKey = row[config.uniqueKey];
          const nameKey = Object.values(config.columnMapping).find((k) => k.includes("ten_") || k.includes("name"));
          if (groupKey) lastGroupKey = String(groupKey);
          else if (nameKey && row[nameKey]) lastGroupKey = `NAME_${String(row[nameKey])}`;
          if (!lastGroupKey) return;

          if (!groupedMap.has(lastGroupKey)) {
            const parent = { children: [] as ImportRow[] } as ImportRow & { children: ImportRow[] };
            Object.values(config.columnMapping).forEach((k) => {
              if (!childKeys.has(k)) parent[k] = row[k];
            });
            groupedMap.set(lastGroupKey, parent);
          }
          const parent = groupedMap.get(lastGroupKey)!;
          if (row[config.childUniqueKey!] || row.noi_dung || row.noi_dung_tieu_chi) {
            const child: ImportRow = {};
            Object.values(config.columnMapping).forEach((k) => {
              if (childKeys.has(k)) child[k] = row[k];
            });
            parent.children.push(child);
          }
        });
        finalData = Array.from(groupedMap.values());
      }

      const updateCount = finalData.filter((x) => !!x[config.uniqueKey]).length;
      const insertCount = finalData.length - updateCount;
      const preview = window.confirm(
        `Xác nhận import ${config.displayName}?\n` +
          `- Tổng bản ghi: ${finalData.length}\n` +
          `- Cập nhật (có mã): ${updateCount}\n` +
          `- Thêm mới (không mã): ${insertCount}\n` +
          `- Dòng thiếu trong file sẽ được soft delete (is_active=false).`,
      );
      if (!preview) {
        toast.info("Đã hủy import theo yêu cầu.", { id: toastId });
        return { success: false, error: "USER_CANCELLED" };
      }

      const res = await config.onImport(finalData);
      if (res.success) {
        toast.success("Import thành công!", { id: toastId });
        if (res.warning) {
          toast.warning(res.warning);
        }
        config.onSuccess?.();
      } else {
        toast.error(`Lỗi: ${res.error}`, { id: toastId });
      }
      return res;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg, { id: toastId });
      return { success: false, error: msg };
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return { handleFileUpload, isImporting, triggerImport, fileInputRef };
}
