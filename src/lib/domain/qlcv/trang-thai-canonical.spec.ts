import { describe, expect, it } from "vitest";
import {
  isQlcvCanonicalTrangThai,
  normalizeQlcvTrangThaiToCanonical,
} from "./trang-thai-canonical";

describe("normalizeQlcvTrangThaiToCanonical", () => {
  it("maps legacy aliases", () => {
    expect(normalizeQlcvTrangThaiToCanonical("CHUA_BAT_DAU")).toBe("MOI");
    expect(normalizeQlcvTrangThaiToCanonical("CHO_NHAN_VIEC")).toBe("DANG_LAM");
    expect(normalizeQlcvTrangThaiToCanonical("DANG_THUC_HIEN")).toBe("DANG_LAM");
    expect(normalizeQlcvTrangThaiToCanonical("CHO_XAC_NHAN_HOAN_THANH")).toBe("CHO_DUYET");
  });

  it("keeps seven canonical codes", () => {
    for (const code of ["MOI", "DANG_LAM", "CHO_DUYET", "HOAN_THANH", "TU_CHOI", "QUA_HAN", "DA_HUY"]) {
      expect(normalizeQlcvTrangThaiToCanonical(code)).toBe(code);
      expect(isQlcvCanonicalTrangThai(code)).toBe(true);
    }
  });

  it("empty → MOI", () => {
    expect(normalizeQlcvTrangThaiToCanonical("")).toBe("MOI");
    expect(normalizeQlcvTrangThaiToCanonical(null)).toBe("MOI");
  });
});
