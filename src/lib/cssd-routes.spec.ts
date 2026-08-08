import { describe, expect, it } from "vitest";
import { CSSD_ROUTES, cssdReportAnalyticsHref, cssdSuCoIncidentJournalHref, cssdSuCoInstrumentHref } from "./cssd-routes";

describe("cssd-routes deep links", () => {
  it("builds instrument prefill URL", () => {
    expect(cssdSuCoInstrumentHref({ type: "INSTRUMENT_BROKEN", ma: "B01" })).toContain(
      `${CSSD_ROUTES.suCo}?`,
    );
    expect(cssdSuCoInstrumentHref({ ma: "B01" })).toContain("group=INSTRUMENT");
    expect(cssdSuCoInstrumentHref({ ma: "B01" })).toContain("ma=B01");
  });

  it("builds incident journal URL with optional highlight id", () => {
    expect(cssdSuCoIncidentJournalHref()).toBe(`${CSSD_ROUTES.report}?tab=incident`);
    expect(cssdSuCoIncidentJournalHref("abc-123")).toBe(
      `${CSSD_ROUTES.report}?tab=incident&id=abc-123`,
    );
  });

  it("builds report analytics deep link with period", () => {
    expect(cssdReportAnalyticsHref({ tab: "volume", from: "2026-07-01", to: "2026-07-31" })).toBe(
      `${CSSD_ROUTES.report}?tab=volume&from=2026-07-01&to=2026-07-31`,
    );
  });
});