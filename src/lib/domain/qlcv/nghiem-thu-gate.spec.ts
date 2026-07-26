import { describe, expect, it } from "vitest";
import { isEligibleForNghiemThu } from "./nghiem-thu-gate";

describe("isEligibleForNghiemThu", () => {
  it("allows CHO_DUYET", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("allows DANG_LAM at 100%", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("rejects DANG_LAM below 100%", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 50 })).toBe(false);
  });

  it("allows QUA_HAN at 100%", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("maps legacy alias CHO_XAC_NHAN_HOAN_THANH", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "CHO_XAC_NHAN_HOAN_THANH", phan_tram_hoan_thanh: 0 })).toBe(
      true,
    );
  });
});
