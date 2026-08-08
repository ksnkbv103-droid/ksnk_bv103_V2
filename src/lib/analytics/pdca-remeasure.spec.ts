import { describe, expect, it } from "vitest";
import {
  computePdcaDelta,
  labelAnalyticsChiSo,
  resolveCurrentAnalyticsMetric,
  summarizeNkbvOutcomeRates,
} from "./pdca-remeasure";

describe("pdca-remeasure", () => {
  it("computes delta current − baseline", () => {
    expect(computePdcaDelta(70, 82)).toBe(12);
    expect(computePdcaDelta(null, 82)).toBeNull();
  });

  it("labels chi_so for PDCA UI", () => {
    expect(labelAnalyticsChiSo("nkbv_cho_xn")).toBe("NKBV chờ xác nhận");
    expect(labelAnalyticsChiSo("ty_le_vst")).toBe("Tỷ lệ VST");
  });

  it("resolves metrics from context", () => {
    expect(
      resolveCurrentAnalyticsMetric("ty_le_ccs", { tyLeCcs: 88.2 }),
    ).toBe(88.2);
    expect(
      resolveCurrentAnalyticsMetric("ty_le_vst", {
        khoaId: "k1",
        khoaTyLeById: { k1: { ty_le_vst: 75 } },
        tyLeVst: 90,
      }),
    ).toBe(75);
  });

  it("summarizes epidemiology rates when denominator > 0", () => {
    const s = summarizeNkbvOutcomeRates([
      {
        obs_cvc_days: 1000,
        obs_clabsi_cases: 2,
        clabsi_sir: 0.8,
        obs_foley_days: 0,
        obs_cauti_cases: 0,
      },
    ]);
    expect(s.clabsi_rate_per_1000).toBe(2);
    expect(s.clabsi_sir).toBe(0.8);
    expect(s.summary).toMatch(/CLABSI/);
  });
});
