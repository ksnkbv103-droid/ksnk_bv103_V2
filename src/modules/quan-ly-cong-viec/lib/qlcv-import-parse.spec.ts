import { describe, expect, it } from "vitest";
import { parseQlcvImportRow } from "./qlcv-import-parse";

describe("parseQlcvImportRow", () => {
  it("accepts valid row with Vietnamese headers", () => {
    const r = parseQlcvImportRow(
      {
        "Tiêu đề": "Kiểm tra phòng mổ",
        ma_nv: "NV001",
        ma_khoa: "KSNK",
        loai_cong_viec: "DOT_XUAT",
        han_hoan_thanh: "2026-12-31",
      },
      2,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row.tieu_de).toBe("Kiểm tra phòng mổ");
      expect(r.row.ma_nv).toBe("NV001");
      expect(r.row.ma_khoa).toBe("KSNK");
    }
  });

  it("rejects missing assignee", () => {
    const r = parseQlcvImportRow({ tieu_de: "X" }, 3);
    expect(r.ok).toBe(false);
  });

  it("rejects missing ma_khoa", () => {
    const r = parseQlcvImportRow({ tieu_de: "X", ma_nv: "NV001" }, 4);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("ma_khoa"))).toBe(true);
  });
});
