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

  it("labels chi_so for PDCA UI (D10: no CCS label)", () => {
    expect(labelAnalyticsChiSo("nkbv_cho_xn")).toBe("NKBV chờ xác nhận");
    expect(labelAnalyticsChiSo("ty_le_vst")).toBe("Tỷ lệ VST");
    expect(labelAnalyticsChiSo("ty_le_ccs")).toBe("Chỉ số đã ngừng dùng");
    expect(labelAnalyticsChiSo("ty_le_ccs")).not.toMatch(/CCS/i);
  });

  it("resolves metrics from context; ty_le_ccs quarantined (D10)", () => {
    expect(resolveCurrentAnalyticsMetric("ty_le_ccs", {})).toBeNull();
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
    // single row: pool = obs/expected = SIR
    expect(s.clabsi_sir).toBe(0.8);
    expect(s.summary).toMatch(/CLABSI/);
  });

  it("pools SIR as Σobs/Σexpected — not average of department SIRs", () => {
    // Khoa A: obs=1, SIR=0.5 → expected=2
    // Khoa B: obs=10, SIR=2.0 → expected=5
    // Average SIR = (0.5+2)/2 = 1.25
    // Pool SIR = 11/7 ≈ 1.57
    const s = summarizeNkbvOutcomeRates([
      {
        obs_cvc_days: 500,
        obs_clabsi_cases: 1,
        clabsi_sir: 0.5,
        obs_foley_days: 400,
        obs_cauti_cases: 2,
        cauti_sir: 1.0,
      },
      {
        obs_cvc_days: 800,
        obs_clabsi_cases: 10,
        clabsi_sir: 2.0,
        obs_foley_days: 600,
        obs_cauti_cases: 3,
        cauti_sir: 0.5,
      },
    ]);
    expect(s.clabsi_sir).toBe(1.57);
    expect(s.clabsi_sir).not.toBe(1.25);
    // CAUTI: obs 2+3=5; expected 2/1 + 3/0.5 = 2+6=8 → 5/8=0.625 → 0.63
    expect(s.cauti_sir).toBe(0.63);
    const avgCauti = (1.0 + 0.5) / 2;
    expect(s.cauti_sir).not.toBe(avgCauti);
  });

  it("pools SIR from pred_* when present (preferred over obs/SIR invert)", () => {
    const s = summarizeNkbvOutcomeRates([
      {
        obs_cvc_days: 1000,
        obs_clabsi_cases: 2,
        clabsi_sir: 99, // ignore when pred present
        pred_clabsi: 4,
        obs_foley_days: 0,
        obs_cauti_cases: 0,
      },
      {
        obs_cvc_days: 1000,
        obs_clabsi_cases: 1,
        clabsi_sir: 99,
        pred_clabsi: 1,
        obs_foley_days: 0,
        obs_cauti_cases: 0,
      },
    ]);
    // (2+1)/(4+1) = 0.6
    expect(s.clabsi_sir).toBe(0.6);
  });
});
