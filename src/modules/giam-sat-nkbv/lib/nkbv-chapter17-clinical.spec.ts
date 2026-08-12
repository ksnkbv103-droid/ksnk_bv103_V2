import { describe, expect, it } from "vitest";
import {
  ch17OperationalSites,
  isCh17SiteCriteriaMet,
} from "./nkbv-chapter17-clinical";

describe("nkbv-chapter17-clinical", () => {
  it("lists operational sites", () => {
    expect(ch17OperationalSites()).toContain("IAB");
    expect(ch17OperationalSites()).toContain("BONE");
    expect(ch17OperationalSites()).toContain("MEN");
    expect(ch17OperationalSites()).toContain("EMET");
    expect(ch17OperationalSites()).toContain("VCUF");
  });

  it("IAB đạt khi có vi sinh dịch ổ bụng (IAB1)", () => {
    const fail = isCh17SiteCriteriaMet({
      siteCode: "IAB",
      flags: { ch17_iab_fever: true },
    });
    expect(fail.applicable).toBe(true);
    expect(fail.met).toBe(false);

    const ok = isCh17SiteCriteriaMet({
      siteCode: "IAB",
      flags: { micro_iab_fluid_or_abscess: true },
    });
    expect(ok.met).toBe(true);
  });

  it("PJI rejects wrong procedure", () => {
    const r = isCh17SiteCriteriaMet({
      siteCode: "PJI",
      procedureCode: "COLO",
      flags: { sx_pji_sinus_tract: true },
    });
    expect(r.met).toBe(false);
    expect(r.reason).toMatch(/COLO/);
  });

  it("unknown site is not applicable", () => {
    const r = isCh17SiteCriteriaMet({ siteCode: "XYZ" });
    expect(r.applicable).toBe(false);
  });
});
