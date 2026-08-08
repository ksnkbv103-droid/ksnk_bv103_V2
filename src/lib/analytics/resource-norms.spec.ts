import { describe, expect, it } from "vitest";
import { expectedPhienGsForPeriod, staffBelowPhienNorm, weeksInRange } from "./resource-norms";

describe("resource-norms", () => {
  it("weeksInRange ceil days/7", () => {
    expect(weeksInRange("2026-07-01", "2026-07-07")).toBe(1);
    expect(weeksInRange("2026-07-01", "2026-07-14")).toBe(2);
  });

  it("flags below phien norm", () => {
    const expected = expectedPhienGsForPeriod({
      soNv: 2,
      tuNgay: "2026-07-01",
      denNgay: "2026-07-07",
    });
    expect(expected).toBe(10);
    const check = staffBelowPhienNorm({
      soNv: 2,
      tongPhienGs: 4,
      tuNgay: "2026-07-01",
      denNgay: "2026-07-07",
    });
    expect(check.below).toBe(true);
    expect(check.expected).toBe(10);
  });
});
