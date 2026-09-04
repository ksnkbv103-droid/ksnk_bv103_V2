import { describe, expect, it } from "vitest";
import {
  formatDurRatio,
  formatRatePer1000,
  formatSsiPercent,
  ratePer1000,
} from "./nkbv-rate-display";

describe("nkbv-rate-display", () => {
  it("ratePer1000 pools cases/device-days", () => {
    expect(ratePer1000(2, 1000)).toBe(2);
    expect(formatRatePer1000(1, 3)).toBe("333.33");
    expect(formatRatePer1000(0, 0)).toBe("—");
  });

  it("DUR requires patient-days > 0 (not device-days)", () => {
    expect(formatDurRatio(10, 0)).toBe("—");
    expect(formatDurRatio(0, 100)).toBe("0.0000");
    expect(formatDurRatio(25, 100)).toBe("0.2500");
  });

  it("SSI percent from surgeries", () => {
    expect(formatSsiPercent(1, 50)).toBe("2.00");
    expect(formatSsiPercent(0, 0)).toBe("—");
  });
});
