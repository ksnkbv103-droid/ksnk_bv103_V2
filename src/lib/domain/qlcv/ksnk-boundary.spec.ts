import { describe, expect, it } from "vitest";
import { pickKsnkKhoaFromRows } from "./ksnk-boundary";

describe("pickKsnkKhoaFromRows", () => {
  it("prefers exact ma_khoa KSNK", () => {
    const picked = pickKsnkKhoaFromRows([
      { id: "c18", ma_khoa: "C18", ten_khoa: "KSNK legacy" },
      { id: "ksnk", ma_khoa: "KSNK", ten_khoa: "Khoa KSNK" },
    ]);
    expect(picked?.id).toBe("ksnk");
  });

  it("falls back to C18 alias", () => {
    const picked = pickKsnkKhoaFromRows([
      { id: "ngoai", ma_khoa: "NGOAI", ten_khoa: "Khoa Ngoại" },
      { id: "c18", ma_khoa: "C18", ten_khoa: "KSNK" },
    ]);
    expect(picked?.id).toBe("c18");
  });

  it("falls back to KHOA_KSNK alias", () => {
    const picked = pickKsnkKhoaFromRows([{ id: "x", ma_khoa: "KHOA_KSNK", ten_khoa: "Import template" }]);
    expect(picked?.id).toBe("x");
  });

  it("falls back to ten_khoa pattern", () => {
    const picked = pickKsnkKhoaFromRows([
      { id: "by-name", ma_khoa: "XYZ", ten_khoa: "Khoa Kiểm soát Nhiễm khuẩn" },
    ]);
    expect(picked?.id).toBe("by-name");
  });

  it("returns null when no match", () => {
    expect(pickKsnkKhoaFromRows([{ id: "n", ma_khoa: "NOI", ten_khoa: "Khoa Nội" }])).toBeNull();
  });
});
