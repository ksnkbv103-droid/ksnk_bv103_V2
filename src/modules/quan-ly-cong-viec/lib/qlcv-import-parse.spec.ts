import { describe, expect, it } from "vitest";
import { parseQlcvImportRow } from "./qlcv-import-parse";

describe("parseQlcvImportRow", () => {
  it("accepts valid row with Vietnamese headers", () => {
    const r = parseQlcvImportRow(
      {
        "Tiêu đề": "Kiểm tra phòng mổ",
        ma_nv: "NV001",
        loai_cong_viec: "DOT_XUAT",
        han_hoan_thanh: "2026-12-31",
      },
      2,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row.tieu_de).toBe("Kiểm tra phòng mổ");
      expect(r.row.ma_nv).toBe("NV001");
    }
  });

  it("rejects missing assignee", () => {
    const r = parseQlcvImportRow({ tieu_de: "X" }, 3);
    expect(r.ok).toBe(false);
  });
});
