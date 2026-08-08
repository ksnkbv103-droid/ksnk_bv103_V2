import { describe, expect, it } from "vitest";
import {
  ch17OperationalSites,
  isCh17SiteCriteriaMet,
} from "./nkbv-chapter17-clinical";

describe("nkbv-chapter17-clinical", () => {
  it("lists operational sites", () => {
    expect(ch17OperationalSites()).toContain("IAB");
    expect(ch17OperationalSites()).toContain("EMET");
  });

  it("IAB needs ≥2 signs", () => {
    const fail = isCh17SiteCriteriaMet({
      siteCode: "IAB",
      flags: { ch17_iab_fever: true },
    });
    expect(fail.applicable).toBe(true);
    expect(fail.met).toBe(false);

    const ok = isCh17SiteCriteriaMet({
      siteCode: "IAB",
      flags: { ch17_iab_fever: true, ch17_iab_abdominal_pain: true },
    });
    expect(ok.met).toBe(true);
  });

  it("EMET rejects wrong procedure", () => {
    const r = isCh17SiteCriteriaMet({
      siteCode: "EMET",
      procedureCode: "COLO",
      flags: {
        ch17_emet_fever: true,
        ch17_emet_uterine_pain: true,
      },
    });
    expect(r.met).toBe(false);
    expect(r.reason).toMatch(/COLO/);
  });

  it("unknown site is not applicable", () => {
    const r = isCh17SiteCriteriaMet({ siteCode: "XYZ" });
    expect(r.applicable).toBe(false);
  });
});
