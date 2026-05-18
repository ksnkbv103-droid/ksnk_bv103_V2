import { describe, it, expect } from "vitest";
import { computeQlcvFinalScore, qlcvTierLabelVietnamese } from "./qlcv-monthly-score";

describe("computeQlcvFinalScore", () => {
  it("đúng công thức §6 (ví dụ)", () => {
    // 0.45*80 + 0.25*60 + 0.3*(4*20) = 36 + 15 + 24 = 75
    expect(computeQlcvFinalScore(80, 60, 4)).toBe(75);
  });

  it("null khi chưa chấm chất lượng", () => {
    expect(computeQlcvFinalScore(100, 100, null)).toBeNull();
  });
});

describe("qlcvTierLabelVietnamese", () => {
  it("phân tầng", () => {
    expect(qlcvTierLabelVietnamese(92)).toContain("90");
    expect(qlcvTierLabelVietnamese(55)).toContain("60");
  });
});
