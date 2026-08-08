"use client";

import { saveAs } from "file-saver";

/** Tải workbook Excel từ mảng object (client). */
export async function downloadRowsAsExcel(
  sheetName: string,
  rows: Record<string, unknown>[],
  fileBase: string,
): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Data");
  if (rows.length === 0) {
    ws.addRow(["(Không có dữ liệu trong phạm vi xuất)"]);
  } else {
    const keys = Object.keys(rows[0]!);
    ws.addRow(keys);
    for (const row of rows) {
      ws.addRow(keys.map((k) => row[k] ?? ""));
    }
  }
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `BV103_${fileBase}.xlsx`);
}
