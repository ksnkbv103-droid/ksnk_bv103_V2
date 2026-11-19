import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { excelCellToPlain } from "./importExport.utils";
import { neutralizeFormula } from "./useExcelExport";

/**
 * NEN-008: xuất Excel thêm «'» trước chuỗi mở đầu bằng = + - @ (chống công thức). exceljs ghi «'» đó thành ký tự thật
 * trong ô, nên nhập lại file xuất phải gỡ đúng một «'» đó — nếu không số điện thoại «+84…» về DB thành «'+84…».
 */
async function roundTrip(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const keys = Object.keys(row);
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("s").addRow(Object.values(neutralizeFormula(row)));
  const buf = await wb.xlsx.writeBuffer();
  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buf as ArrayBuffer);
  const r = back.getWorksheet("s")!.getRow(1);
  return Object.fromEntries(keys.map((k, i) => [k, excelCellToPlain(r.getCell(i + 1).value)]));
}

describe("export → import giữ nguyên chuỗi mở đầu bằng ký tự công thức", () => {
  it("sđt «+84…» và ghi chú «- …» về đúng giá trị gốc", async () => {
    const out = await roundTrip({ sdt: "+84901234567", ghi_chu: "- cần bổ sung", cong_thuc: "=1+1", at: "@SUM(A1)" });
    expect(out).toEqual({ sdt: "+84901234567", ghi_chu: "- cần bổ sung", cong_thuc: "=1+1", at: "@SUM(A1)" });
  });

  it("số âm kiểu number và chuỗi thường không bị đổi", async () => {
    const out = await roundTrip({ so_am: -5, chu: "Khoa Nội", sdt_0: "0901234567" });
    expect(out).toEqual({ so_am: -5, chu: "Khoa Nội", sdt_0: "0901234567" });
  });
});

describe("excelCellToPlain — chỉ gỡ «'» do neutralize", () => {
  it("gỡ một «'» đầu khi ký tự kế tiếp là = + - @ tab CR", () => {
    for (const c of ["=", "+", "-", "@", "\t", "\r"]) expect(excelCellToPlain(`'${c}x`)).toBe(`${c}x`);
  });

  it("giữ «'» khi không đứng ngay trước ký tự công thức (O'Brien, 'abc, ''+84)", () => {
    expect(excelCellToPlain("'abc")).toBe("'abc");
    expect(excelCellToPlain("O'Brien")).toBe("O'Brien");
    expect(excelCellToPlain("''+84")).toBe("''+84"); // neutralizeFormula không bao giờ sinh dạng này
  });

  it("gỡ cả khi ô là richText hoặc công thức có text", () => {
    expect(excelCellToPlain({ richText: [{ text: "'+84" }, { text: "901" }] })).toBe("+84901");
    expect(excelCellToPlain({ text: "'-x" })).toBe("-x");
  });
});
