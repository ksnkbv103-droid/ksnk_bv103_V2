import { describe, expect, it } from "vitest";
import { resolveDanhMucViewModuleByType } from "./danh-muc-permission-map";

describe("resolveDanhMucViewModuleByType", () => {
  it("uses PHAN_QUYEN for system role category", () => {
    expect(resolveDanhMucViewModuleByType("VAI_TRO_HE_THONG_KSNK")).toBe("PHAN_QUYEN");
  });

  it("normalizes type casing and spaces", () => {
    expect(resolveDanhMucViewModuleByType("  khoa_phong  ")).toBe("KHOA_PHONG");
  });

  it("throws for invalid category type", () => {
    expect(() => resolveDanhMucViewModuleByType("INVALID_TYPE")).toThrowError(
      "Không tìm thấy loại danh mục",
    );
  });
});
