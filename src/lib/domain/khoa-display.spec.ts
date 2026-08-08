import { describe, expect, it } from "vitest";
import {
  formatKhoaCompactLabel,
  formatKhoaPickerLabel,
  parseMaFromKhoaOptionLabel,
} from "./khoa-display";

describe("formatKhoaPickerLabel", () => {
  it("ghép Mã - Tên", () => {
    expect(formatKhoaPickerLabel({ ma_khoa: "A05", ten_khoa: "Khoa truyền nhiễm" })).toBe(
      "A05 - Khoa truyền nhiễm",
    );
  });

  it("chỉ mã khi thiếu tên", () => {
    expect(formatKhoaPickerLabel({ ma_khoa: "A03" })).toBe("A03");
  });

  it("chỉ tên khi thiếu mã", () => {
    expect(formatKhoaPickerLabel({ ten_khoa: "Khoa phổi" })).toBe("Khoa phổi");
  });

  it("nhận alias ma/ten_danh_muc", () => {
    expect(formatKhoaPickerLabel({ ma: "C18", ten_danh_muc: "KSNK" })).toBe("C18 - KSNK");
  });
});

describe("formatKhoaCompactLabel", () => {
  it("ưu tiên mã", () => {
    expect(formatKhoaCompactLabel({ ma_khoa: "A03", ten_khoa: "Khoa phổi" })).toBe("A03");
  });

  it("fallback tên khi thiếu mã", () => {
    expect(formatKhoaCompactLabel({ ten_khoa: "Khoa phổi" })).toBe("Khoa phổi");
  });

  it("— khi trống", () => {
    expect(formatKhoaCompactLabel({})).toBe("—");
  });
});

describe("parseMaFromKhoaOptionLabel", () => {
  it("parse Mã - Tên", () => {
    expect(parseMaFromKhoaOptionLabel("A05 - Khoa truyền nhiễm")).toBe("A05");
  });

  it("parse [mã] tên", () => {
    expect(parseMaFromKhoaOptionLabel("[A05] Khoa truyền nhiễm")).toBe("A05");
  });

  it("parse ten (ma)", () => {
    expect(parseMaFromKhoaOptionLabel("Khoa phổi (A03)")).toBe("A03");
  });
});
