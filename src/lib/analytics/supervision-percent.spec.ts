import { describe, expect, it } from "vitest";
import {
  formatGapDeltaPercent,
  formatPercent1,
  formatPercent1FromRatio,
  formatSupervisionPercent,
  roundPercent1,
  supervisionPercentDigits,
  formatWilsonInterval95,
  wilsonInterval95,
} from "./supervision-percent";

describe("supervision-percent VST (1 decimal)", () => {
  it("roundPercent1: 2/3 → 66.7", () => {
    expect(roundPercent1((2 / 3) * 100)).toBe(66.7);
  });

  it("formatPercent1 / formatPercent1FromRatio", () => {
    expect(formatPercent1(66.66)).toBe("66.7%");
    expect(formatPercent1FromRatio(2, 3)).toBe("66.7%");
    expect(formatPercent1FromRatio(0, 0)).toBe("—");
    expect(formatPercent1(null)).toBe("—");
  });
});

describe("supervision display digits", () => {
  it("VST stays 1 decimal; GSC stays 2 — 66.7 is not shown as 66.70", () => {
    expect(supervisionPercentDigits("VST")).toBe(1);
    expect(supervisionPercentDigits("GSC")).toBe(2);
    expect(formatSupervisionPercent(66.7, 1)).toBe("66.7%");
    expect(formatSupervisionPercent(66.67, 2)).toBe("66.67%");
    expect(formatSupervisionPercent(66.7, 2)).toBe("66.70%");
  });

  it("gap delta uses the module digit count", () => {
    expect(formatGapDeltaPercent(66.7, 33.3, 1)).toBe("Δ 33.4%");
    expect(formatGapDeltaPercent(66.67, 33.33, 2)).toBe("Δ 33.34%");
    expect(formatGapDeltaPercent(null, 33.3, 1)).toBeNull();
  });
});

describe("wilsonInterval95", () => {
  it("n=20, 16 đạt (80%) → khoảng 58–92%", () => {
    const ci = wilsonInterval95(16, 20)!;
    expect(ci.low).toBeCloseTo(58.4, 1);
    expect(ci.high).toBeCloseTo(91.9, 1);
    expect(formatWilsonInterval95(16, 20)).toBe("KTC 95% 58–92%");
  });
  it("mẫu lớn thì khoảng hẹp", () => {
    const ci = wilsonInterval95(800, 1000)!;
    expect(ci.high - ci.low).toBeLessThan(5.1);
  });
  it("biên 0% và 100% không vượt [0, 100]", () => {
    expect(wilsonInterval95(0, 10)!.low).toBe(0);
    expect(wilsonInterval95(10, 10)!.high).toBe(100);
  });
  it("mẫu 0 → null", () => {
    expect(wilsonInterval95(0, 0)).toBeNull();
    expect(formatWilsonInterval95(0, 0)).toBeNull();
  });
});
