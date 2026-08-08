import { describe, expect, it } from "vitest";
import {
  buildLisExcelSampleMatrix,
  parseLisDateToIso,
  parseLisOrInternalPaste,
} from "./nkbv-lis-adapter";
import { buildViSinhTemplateTsv, normalizeKetQua } from "./nkbv-vi-sinh-template";

describe("nkbv-lis-adapter", () => {
  it("normalizeKetQua — dưới ngưỡng → AM; bệnh phẩm nhiễm → NHIEU", () => {
    expect(normalizeKetQua("Dưới ngưỡng gây bệnh")).toBe("AM_TINH");
    expect(normalizeKetQua("Bệnh phẩm nhiễm")).toBe("NHIEU");
    expect(normalizeKetQua("Dương tính")).toBe("DUONG_TINH");
    expect(normalizeKetQua("Âm tính")).toBe("AM_TINH");
  });

  it("parseLisDateToIso nhận M/D/YY", () => {
    expect(parseLisDateToIso("3/10/23 14:53")).toBe("2023-03-10");
    expect(parseLisDateToIso("2026-05-18")).toBe("2026-05-18");
  });

  it("parse mẫu nội bộ vẫn chạy", () => {
    const res = parseLisOrInternalPaste(buildViSinhTemplateTsv());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.format).toBe("internal");
    expect(res.rows.every((r) => !r.needs_stay_fields)).toBe(true);
  });

  it("parse mẫu LIS tiếng Việt — thiếu BA/ngày VV → needs_stay_fields", () => {
    const header = [
      "TT",
      "Barcode",
      "Mã bệnh nhân",
      "Họ và tên",
      "Giới tính",
      "Năm sinh",
      "Số phiếu",
      "Mã khoa chỉ định",
      "Loại bệnh phẩm",
      "Kết quả",
      "Mã vi khuẩn",
      "Tên vi khuẩn",
      "Ngày thực hiện",
      "esccol",
      "tkga",
    ].join("\t");
    const pos = [
      "1",
      "905044",
      "22283616",
      "HỒNG THỊ KIM LAN",
      "Nữ",
      "1963",
      "XN230307.1450",
      "PĐT A11",
      "Máu",
      "Dương tính",
      "esccol",
      "Escherichia coli",
      "3/7/23 11:38",
      "",
      "",
    ].join("\t");
    const under = [
      "2",
      "B905418",
      "23040041",
      "NGUYỄN VĂN TÚ",
      "Nam",
      "1934",
      "XN230315.90",
      "PĐT A03",
      "Nước tiểu",
      "Dưới ngưỡng gây bệnh",
      "tkga",
      "Trực khuẩn Gram (-)",
      "3/16/23 8:28",
      "",
      "2000",
    ].join("\t");
    const contam = [
      "3",
      "905764",
      "22075396",
      "NGUYỄN ĐỨC CUÔNG",
      "Nam",
      "1957",
      "XN230323.1619",
      "PĐT A03",
      "Máu",
      "Bệnh phẩm nhiễm",
      "",
      "",
      "3/23/23 19:39",
      "",
      "",
    ].join("\t");

    const res = parseLisOrInternalPaste([header, pos, under, contam].join("\n"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.format).toBe("lis");
    expect(res.rows).toHaveLength(3);
    expect(res.rows.every((r) => r.needs_stay_fields)).toBe(true);
    expect(res.rows[0].ket_qua).toBe("DUONG_TINH");
    expect(res.rows[0].tac_nhan).toContain("Escherichia");
    expect(res.rows[0].ma_xet_nghiem).toBe("XN230307.1450");
    expect(res.rows[1].ket_qua).toBe("AM_TINH");
    expect(res.rows[2].ket_qua).toBe("NHIEU");
  });

  it("mẫu Excel LIS có cột BA / ngày vào viện", () => {
    const matrix = buildLisExcelSampleMatrix();
    expect(matrix[0]).toContain("Mã bệnh án");
    expect(matrix[0]).toContain("Ngày vào viện");
    const tsv = matrix.map((r) => r.join("\t")).join("\n");
    const res = parseLisOrInternalPaste(tsv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const filled = res.rows.filter((r) => !r.needs_stay_fields);
    expect(filled.length).toBeGreaterThanOrEqual(1);
  });

  it("cùng Số phiếu + khác Mã dịch vụ → khóa XN khác nhau", () => {
    const header = [
      "Số phiếu",
      "Mã bệnh nhân",
      "Họ và tên",
      "Loại bệnh phẩm",
      "Kết quả",
      "Ngày thực hiện",
      "Mã dịch vụ",
    ].join("\t");
    const a = ["XN1", "BN1", "A", "Máu", "Âm tính", "3/10/23 14:53", "DV3465"].join("\t");
    const b = ["XN1", "BN1", "A", "Máu", "Âm tính", "3/10/23 14:53", "DV3467"].join("\t");
    const res = parseLisOrInternalPaste([header, a, b].join("\n"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].ma_xet_nghiem).not.toBe(res.rows[1].ma_xet_nghiem);
  });
});
