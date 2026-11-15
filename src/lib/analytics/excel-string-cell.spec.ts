import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

/**
 * Các chỗ xuất .xlsx (useExcelExport, downloadRowsAsExcel, …) đưa chuỗi thô vào `addRow`.
 * Spec này khóa giả định: exceljs ghi chuỗi thành ô văn bản, không thành công thức,
 * kể cả sau khi ghi ra file và đọc lại.
 */
describe("exceljs — chuỗi bắt đầu bằng '=' không thành công thức", () => {
  it("ô vẫn là chuỗi sau khi ghi và đọc lại", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("s").addRow(["=1+1", "@SUM(A1)", "+84", "-x"]);
    const buf = await wb.xlsx.writeBuffer();

    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    const row = back.getWorksheet("s")!.getRow(1);
    for (const col of [1, 2, 3, 4]) {
      const cell = row.getCell(col);
      expect(cell.type).toBe(ExcelJS.ValueType.String);
      expect(cell.formula).toBeUndefined();
    }
    expect(row.getCell(1).value).toBe("=1+1");
  });
});
