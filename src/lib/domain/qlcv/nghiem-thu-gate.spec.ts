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
});
