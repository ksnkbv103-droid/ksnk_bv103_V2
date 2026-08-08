"use client";

import { saveAs } from "file-saver";
import { toast } from "sonner";
import { buildLockedTemplateMapping } from "@/lib/import-export-template";
import type { ImportExportConfig, ImportRow } from "./importExport.types";

function addImportGuideSheet(
  workbook: { addWorksheet: (name: string) => { addRow: (v: unknown[]) => void; getColumn: (n: number) => { width?: number } } },
  config: ImportExportConfig,
  headers: string[],
) {
  const guide = workbook.addWorksheet("Huong dan");
  guide.getColumn(1).width = 28;
  guide.getColumn(2).width = 72;
  const rows: [string, string][] = [
    ["Danh mục", config.displayName],
    ["Bước 1", "Giữ nguyên dòng tiêu đề ở sheet dữ liệu (không đổi tên cột)."],
    ["Bước 2", "Sửa / thêm dòng. Giữ mã khi cập nhật; để trống mã khi thêm mới (nếu màn hỗ trợ tự sinh mã)."],
    [
      "Bước 3",
      config.disableSyncFull
        ? "Nạp Excel → xem trước → chọn «Chỉ thêm / cập nhật (an toàn)»."
        : "Nạp Excel → xem trước → «An toàn» (không ẩn bản ghi thiếu) hoặc «Đồng bộ đầy đủ» (ẩn/tắt bản ghi thiếu trong file — không xóa khỏi hệ thống).",
    ],
    ["Cột trong file", headers.join(" · ") || "(theo dòng tiêu đề sheet 1)"],
    ["Lưu ý", "Chỉ dùng file .xlsx/.xls. Hủy ở hộp xác nhận = không ghi dữ liệu."],
  ];
  rows.forEach(([k, v]) => guide.addRow([k, v]));
}

export function useExcelExport(config: ImportExportConfig, normalizedMapping: Record<string, string>) {
  const exportTemplate = async (currentData?: ImportRow[]) => {
    const toastId = toast.loading(`Đang xuất ${config.displayName}...`);
    try {
      let dataToExport = currentData;
      if (config.onGetData) {
        const res = await config.onGetData();
        if (res.success) dataToExport = res.data;
      }

      // exceljs nặng ~940KB — chỉ tải khi user thực sự export
      const { default: ExcelJS } = await import("exceljs");
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
      const columns = Object.entries(exportMapping).map(([header, key]) => ({
        header: header.toUpperCase(),
        key,
        width: 25,
      }));
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

      addImportGuideSheet(
        workbook,
        config,
        columns.map((c) => String(c.header)),
      );

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
