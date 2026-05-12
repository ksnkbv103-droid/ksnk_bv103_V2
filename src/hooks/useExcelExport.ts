"use client";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { buildLockedTemplateMapping } from "@/lib/import-export-template";
import type { ImportExportConfig, ImportRow } from "./importExport.types";

export function useExcelExport(config: ImportExportConfig, normalizedMapping: Record<string, string>) {
  const exportTemplate = async (currentData?: ImportRow[]) => {
    const toastId = toast.loading(`Đang xuất ${config.displayName}...`);
    try {
      let dataToExport = currentData;
      if (config.onGetData) {
        const res = await config.onGetData();
        if (res.success) dataToExport = res.data;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(config.displayName);
      const exportMapping = !config.isHierarchical
        ? buildLockedTemplateMapping({
            tableName: config.tableName,
            uniqueKey: config.uniqueKey,
            baseMapping: normalizedMapping,
            data: dataToExport,
          })
        : { ...normalizedMapping };
      const columns = Object.entries(exportMapping).map(([header, key]) => ({ header: header.toUpperCase(), key, width: 25 }));
      worksheet.columns = columns;
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF026F17" } };

      if (dataToExport && dataToExport.length > 0) {
        dataToExport.forEach((item) => {
          const baseItem = { ...item, is_active: item?.is_active ?? true };
          if (config.isHierarchical && config.childArrayKey) {
            const rawChildren = item[config.childArrayKey];
            const children = Array.isArray(rawChildren) ? rawChildren : [];
            if (children.length > 0) {
              (children as ImportRow[]).forEach((child: ImportRow) =>
                worksheet.addRow({
                  ...baseItem,
                  ...child,
                  is_active: child?.is_active ?? baseItem.is_active,
                }),
              );
            } else {
              worksheet.addRow(baseItem);
            }
          } else {
            worksheet.addRow(baseItem);
          }
        });
      }
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `BV103_${config.displayName.replace(/\s/g, "_")}.xlsx`);
      toast.success(`Đã xuất file ${config.displayName}`, { id: toastId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Lỗi: ${msg}`, { id: toastId });
    }
  };

  return { exportTemplate };
}
