import { describe, expect, it } from "vitest";
import { computeQlcvMvpStats } from "./qlcv-mvp-stats";

describe("computeQlcvMvpStats", () => {
  it("computes tong / % HT / % quá hạn from loaded rows", () => {
    const out = computeQlcvMvpStats([
      { trang_thai: "HOAN_THANH", is_active: true },
      { trang_thai: "DANG_LAM", is_active: true, is_qua_han: true },
      { trang_thai: "DANG_LAM", is_active: true },
      { trang_thai: "MOI", is_active: false }, // đề xuất — loại
    ]);
    expect(out.tong).toBe(3);
    expect(out.hoanThanh).toBe(1);
    expect(out.quaHan).toBe(1);
    expect(out.pctHoanThanh).toBeCloseTo(33.3, 0);
    expect(out.pctQuaHan).toBeCloseTo(33.3, 0);
  });

  it("zeros on empty", () => {
    expect(computeQlcvMvpStats([])).toEqual({
      tong: 0,
      hoanThanh: 0,
      quaHan: 0,
      pctHoanThanh: 0,
      pctQuaHan: 0,
    });
  });
});
