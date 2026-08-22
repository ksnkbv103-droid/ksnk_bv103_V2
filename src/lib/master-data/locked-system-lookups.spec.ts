import { describe, expect, it } from "vitest";
import { isLockedSystemLookup } from "./locked-system-lookups";

describe("isLockedSystemLookup", () => {
  it("khóa trạng thái, trạm và vai trò hệ thống", () => {
    expect(isLockedSystemLookup("TRAM_CSSD")).toBe(true);
    expect(isLockedSystemLookup("TRANG_THAI_CONG_VIEC")).toBe(true);
    expect(isLockedSystemLookup("TRANG_THAI_NKBV_CA")).toBe(true);
    expect(isLockedSystemLookup("VAI_TRO_HE_THONG_KSNK")).toBe(true);
  });

  it("không khóa danh mục viện sửa hàng ngày", () => {
    expect(isLockedSystemLookup("CHUC_DANH")).toBe(false);
    expect(isLockedSystemLookup("KHOA_PHONG")).toBe(false);
  });
});
