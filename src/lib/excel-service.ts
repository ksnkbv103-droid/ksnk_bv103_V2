// src/lib/excel-service.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export async function exportToExcel(params: {
  filename: string;
  sheetName: string;
  columns: { header: string; key: string; width: number }[];
  data: any[];
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(params.sheetName);
  worksheet.columns = params.columns;

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF026F17" } };

  params.data.forEach((item) => {
    worksheet.addRow(item);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${params.filename}.xlsx`);
}

export async function readExcelFile(file: File) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("File trống");
  return worksheet;
}
