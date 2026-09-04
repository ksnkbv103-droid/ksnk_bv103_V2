import { describe, expect, it } from "vitest";
import {
  formatPercent1,
  formatPercent1FromRatio,
  roundPercent1,
} from "./supervision-percent";

describe("supervision-percent VST (1 decimal)", () => {
  it("roundPercent1: 2/3 → 66.7", () => {
    expect(roundPercent1((2 / 3) * 100)).toBe(66.7);
  });

  it("formatPercent1 / formatPercent1FromRatio", () => {
    expect(formatPercent1(66.66)).toBe("66.7%");
    expect(formatPercent1FromRatio(2, 3)).toBe("66.7%");
    expect(formatPercent1FromRatio(0, 0)).toBe("—");
  });
});
