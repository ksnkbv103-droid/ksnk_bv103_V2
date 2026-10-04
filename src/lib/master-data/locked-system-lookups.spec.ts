import { describe, expect, it } from "vitest";
import { isLockedSystemLookup, lockedSystemLookupMutateError } from "./locked-system-lookups";

describe("isLockedSystemLookup", () => {
  it("khóa QLCV enum, NKBV loại/TT, trạm và vai trò hệ thống", () => {
    expect(isLockedSystemLookup("LOAI_CONG_VIEC")).toBe(true);
    expect(isLockedSystemLookup("TRAM_CSSD")).toBe(true);
    expect(isLockedSystemLookup("TRANG_THAI_CONG_VIEC")).toBe(true);
    expect(isLockedSystemLookup("TRANG_THAI_NKBV_CA")).toBe(true);
    expect(isLockedSystemLookup("LOAI_NKBV")).toBe(true);
    expect(isLockedSystemLookup("VAI_TRO_HE_THONG_KSNK")).toBe(true);
    expect(isLockedSystemLookup("NGHE_NGHIEP")).toBe(true);
  });

  it("không khóa danh mục viện sửa hàng ngày", () => {
    expect(isLockedSystemLookup("CHUC_DANH")).toBe(false);
    expect(isLockedSystemLookup("KHOA_PHONG")).toBe(false);
  });

  it("reject mutate message for TRAM_CSSD (no 7th station via hub)", () => {
    expect(lockedSystemLookupMutateError("TRAM_CSSD")).toMatch(/chỉ xem/);
    expect(lockedSystemLookupMutateError("CHUC_DANH")).toBeNull();
  });
});
