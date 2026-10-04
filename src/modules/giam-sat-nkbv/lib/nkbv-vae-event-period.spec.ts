import { describe, expect, it } from "vitest";
import {
  evaluateVaeEventPeriodSuppress,
  findPriorVaeEventPeriodOwner,
  hydratePriorOpenVaeDoe,
  isDoeInPriorVaeEventPeriod,
  priorCasesToPriorVaesForEventPeriod,
  VAE_EVENT_PERIOD_SUPPRESS_CLASSIFICATION,
} from "./nkbv-vae-event-period";
import { vaeEventPeriod } from "./nkbv-shared-timeline";

describe("NKBV-L11 VAE Event Period (not RIT Ch.2)", () => {
  it("vaeEventPeriod: DOE = day 1 → end = DOE+13 (14 calendar days)", () => {
    expect(vaeEventPeriod("2026-08-01")).toEqual({
      start: "2026-08-01",
      end: "2026-08-14",
    });
  });

  it("suppress VAE mới DOE+5d sau VAC", () => {
    expect(isDoeInPriorVaeEventPeriod("2026-08-06", "2026-08-01")).toBe(true);
    const g = evaluateVaeEventPeriodSuppress({
      candidateDoe: "2026-08-06",
      priorOpenVaeDoe: "2026-08-01",
    });
    expect(g.suppressed).toBe(true);
    expect(g.classification).toBe(VAE_EVENT_PERIOD_SUPPRESS_CLASSIFICATION);
    expect(g.reason).toMatch(/Event Period/);
    expect(g.reason).not.toMatch(/RIT Ch\.2.*áp/);
  });

  it("hết 14d → cho VAE mới", () => {
    // DOE+13 = last day IN period; DOE+14 = out
    expect(isDoeInPriorVaeEventPeriod("2026-08-14", "2026-08-01")).toBe(true);
    expect(isDoeInPriorVaeEventPeriod("2026-08-15", "2026-08-01")).toBe(false);
    expect(
      evaluateVaeEventPeriodSuppress({
        candidateDoe: "2026-08-15",
        priorOpenVaeDoe: "2026-08-01",
      }).suppressed,
    ).toBe(false);
  });

  it("findPriorVaeEventPeriodOwner picks VAC/IVAC/PVAP only", () => {
    const owner = findPriorVaeEventPeriodOwner("2026-08-05", [
      { id: "a", doe: "2026-08-01", classification: "VAC" },
      { id: "b", doe: "2026-07-01", classification: "PVAP" },
    ]);
    expect(owner?.id).toBe("a");
  });

  it("candidate trước prior DOE → không suppress", () => {
    expect(isDoeInPriorVaeEventPeriod("2026-07-31", "2026-08-01")).toBe(false);
  });
});

describe("L11 hydrate prior_open_vae_doe Soft Soft Soft-safe", () => {
  it("hydratePriorOpenVaeDoe picks prior VAC DOE when candidate ∈ Event Period", () => {
    const doe = hydratePriorOpenVaeDoe({
      candidateDoe: "2026-08-06",
      priorCases: [
        {
          id: "v1",
          doe: "2026-08-01",
          loai_ma: "VAE",
          classification: "VAC",
        },
        {
          id: "u1",
          doe: "2026-08-02",
          loai_ma: "UTI",
        },
      ],
      excludeEventIds: ["self"],
    });
    expect(doe).toBe("2026-08-01");
  });

  it("hydratePriorOpenVaeDoe returns null when candidate after Event Period", () => {
    const doe = hydratePriorOpenVaeDoe({
      candidateDoe: "2026-08-15",
      priorCases: [{ id: "v1", doe: "2026-08-01", loai_ma: "VAE", classification: "VAC" }],
    });
    expect(doe).toBeNull();
  });

  it("priorCasesToPriorVaesForEventPeriod skips non-VAE", () => {
    const list = priorCasesToPriorVaesForEventPeriod([
      { id: "a", doe: "2026-08-01", loai_ma: "UTI" },
      { id: "b", doe: "2026-08-01", loai_ma: "VAE", classification: "IVAC" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("b");
  });
});
