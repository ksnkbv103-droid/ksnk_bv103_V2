import { describe, expect, it } from "vitest";
import { classifyFunnel, funnelLimits, funnelOverallRate } from "./supervision-funnel";

describe("supervision-funnel", () => {
  it("tỷ lệ chung = tổng đạt / tổng cơ hội, bỏ hàng n ≤ 0", () => {
    expect(
      funnelOverallRate([
        { dat: 30, tong: 40 },
        { dat: 10, tong: 20 },
        { dat: 0, tong: 0 },
      ]),
    ).toBeCloseTo(40 / 60, 10);
    expect(funnelOverallRate([])).toBeNull();
  });

  it("giới hạn tính tay: p0=0.8, n=100 → 0.8 ± 1.96·0.04 = 72.16–87.84%", () => {
    const lim = funnelLimits(0.8, 100)!;
    expect(lim.low).toBeCloseTo(72.16, 2);
    expect(lim.high).toBeCloseTo(87.84, 2);
  });

  it("dải rộng hơn khi n nhỏ", () => {
    const small = funnelLimits(0.8, 25)!;
    const big = funnelLimits(0.8, 400)!;
    expect(small.high - small.low).toBeGreaterThan(big.high - big.low);
  });

  it("kẹp trong 0–100% và từ chối đầu vào xấu", () => {
    const lim = funnelLimits(0.98, 10)!;
    expect(lim.high).toBeLessThanOrEqual(100);
    expect(funnelLimits(0.5, 0)).toBeNull();
    expect(funnelLimits(1.2, 10)).toBeNull();
  });

  it("xếp trên/dưới/trong dải (p0=0.8, n=100)", () => {
    expect(classifyFunnel(95, 100, 0.8)).toBe("above");
    expect(classifyFunnel(60, 100, 0.8)).toBe("below");
    expect(classifyFunnel(80, 100, 0.8)).toBe("within");
    expect(classifyFunnel(3, 5, 0.8)).toBe("within");
    expect(classifyFunnel(1, 0, 0.8)).toBeNull();
  });
});
