import { describe, expect, it } from "vitest";
import { isWithinLuot, normalizeSoLan, summarizeLuot } from "./dao-tao-luot";

describe("dao-tao-luot", () => {
  it("normalizeSoLan mặc định 1", () => {
    expect(normalizeSoLan(null)).toBe(1);
    expect(normalizeSoLan(0)).toBe(1);
    expect(normalizeSoLan(3)).toBe(3);
  });

  it("dang_lam tiêu lượt nhưng không tính đã nộp", () => {
    const s = summarizeLuot([{ trang_thai: "da_nop" }, { trang_thai: "dang_lam" }], 2);
    expect(s).toEqual({ daNop: 1, tieuLuot: 2, conLuot: false, soLanChoPhep: 2 });
  });

  it("còn lượt khi chưa đủ", () => {
    expect(summarizeLuot([{ trang_thai: "het_gio" }], 2).conLuot).toBe(true);
    expect(summarizeLuot([], undefined).conLuot).toBe(true);
  });

  it("isWithinLuot: race chỉ giữ đúng soLan lần đầu", () => {
    const rows = [
      { id: "b", bat_dau_luc: "2026-01-01T00:00:00Z", trang_thai: "dang_lam" },
      { id: "a", bat_dau_luc: "2026-01-01T00:00:00Z", trang_thai: "dang_lam" },
    ];
    expect(isWithinLuot(rows, "a", 1)).toBe(true);
    expect(isWithinLuot(rows, "b", 1)).toBe(false);
    expect(isWithinLuot(rows, "b", 2)).toBe(true);
  });
});
