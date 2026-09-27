import { describe, expect, it } from "vitest";
import {
  MBI_ANC_WBC_LT_CELLS_PER_MM3,
  MBI_NEUTROPENIA_MIN_SEPARATE_DAYS,
  MBI_NEUTROPENIA_WINDOW_DAYS_AFTER,
  MBI_NEUTROPENIA_WINDOW_DAYS_BEFORE,
  evaluateMbiMucosalBarrier,
  meetsMbiNeutropeniaFromSamples,
  mbiNeutropeniaWindow,
} from "./nkbv-mbi-ch4";

describe("nkbv-mbi-ch4 Soft 20e cite constants", () => {
  it("exposes Ch.4 cited thresholds (cdc-ch4.txt:425-427)", () => {
    expect(MBI_ANC_WBC_LT_CELLS_PER_MM3).toBe(500);
    expect(MBI_NEUTROPENIA_MIN_SEPARATE_DAYS).toBe(2);
    expect(MBI_NEUTROPENIA_WINDOW_DAYS_BEFORE).toBe(3);
    expect(MBI_NEUTROPENIA_WINDOW_DAYS_AFTER).toBe(3);
  });

  it("neutropenia window = blood ±3 calendar days", () => {
    expect(mbiNeutropeniaWindow("2026-03-10")).toEqual({
      start: "2026-03-07",
      end: "2026-03-13",
    });
  });

  it("Table 5 Patient A pattern: Day -1 and Day 1 WBC <500 → meet", () => {
    // cite cdc-ch4.txt:878-879
    expect(
      meetsMbiNeutropeniaFromSamples(
        [
          { date: "2026-03-09", wbc: 320 },
          { date: "2026-03-10", wbc: 400 },
        ],
        "2026-03-10",
      ),
    ).toBe(true);
  });

  it("single low day → not neutropenia", () => {
    expect(
      meetsMbiNeutropeniaFromSamples([{ date: "2026-03-10", wbc: 400 }], "2026-03-10"),
    ).toBe(false);
  });

  it("values ≥500 do not count; outside window ignored", () => {
    expect(
      meetsMbiNeutropeniaFromSamples(
        [
          { date: "2026-03-01", wbc: 100 }, // outside
          { date: "2026-03-10", wbc: 600 },
          { date: "2026-03-11", anc: 550 },
        ],
        "2026-03-10",
      ),
    ).toBe(false);
  });

  it("barrier: diarrhea alone → not met", () => {
    const r = evaluateMbiMucosalBarrier({ has_severe_diarrhea_mbi: true });
    expect(r.met).toBe(false);
  });

  it("barrier: neutropenia attest → met", () => {
    const r = evaluateMbiMucosalBarrier({ anc_wbc_lt_500_ge_2d: true });
    expect(r.met).toBe(true);
    expect(r.arms).toContain("NEUTROPENIA");
  });

  it("barrier: HSCT attest → met; HSCT+diarrhea → diarrhea arm", () => {
    expect(evaluateMbiMucosalBarrier({ has_hsct_or_gvhd: true }).met).toBe(true);
    const both = evaluateMbiMucosalBarrier({
      has_hsct_or_gvhd: true,
      has_severe_diarrhea_mbi: true,
    });
    expect(both.met).toBe(true);
    expect(both.arms).toContain("ALLO_HSCT_DIARRHEA");
  });
});
