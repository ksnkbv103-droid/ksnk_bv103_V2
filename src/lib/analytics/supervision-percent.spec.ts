import { describe, expect, it } from "vitest";
import {
  formatGapDeltaPercent,
  formatPercent1,
  formatPercent1FromRatio,
  formatSupervisionPercent,
  roundPercent1,
  supervisionPercentDigits,
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
