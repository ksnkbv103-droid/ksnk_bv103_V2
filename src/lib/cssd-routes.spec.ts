import { describe, expect, it } from "vitest";
import { CSSD_ROUTES, cssdReportAnalyticsHref, cssdSuCoBatchRecallHref, cssdSuCoIncidentJournalHref, cssdSuCoInstrumentHref } from "./cssd-routes";
import {
  INSTRUMENT_MOVE_TYPE_ID,
  INSTRUMENT_PHYSICAL_DOOR_ID,
  SET_RECONCILE_TYPE_ID,
} from "@/lib/domain/cssd-set-reconcile";

describe("cssd-routes deep links", () => {
  it("builds instrument prefill URL and coerces legacy types to 3 doors (D4)", () => {
    const broken = cssdSuCoInstrumentHref({ type: "INSTRUMENT_BROKEN", ma: "B01" });
    expect(broken).toContain(`${CSSD_ROUTES.suCo}?`);
    expect(broken).toContain(`type=${INSTRUMENT_PHYSICAL_DOOR_ID}`);
    expect(broken).not.toContain("INSTRUMENT_BROKEN");
    expect(broken).toContain("ma=B01");

    const transfer = cssdSuCoInstrumentHref({ type: "INSTRUMENT_TRANSFER" });
    expect(transfer).toContain(`type=${INSTRUMENT_MOVE_TYPE_ID}`);
    expect(transfer).not.toContain("TRANSFER");

    const replenish = cssdSuCoInstrumentHref({ type: "INSTRUMENT_REPLENISH" });
    expect(replenish).toContain(`type=${INSTRUMENT_MOVE_TYPE_ID}`);
    expect(replenish).not.toContain("REPLENISH");

    const missing = cssdSuCoInstrumentHref({ type: "INSTRUMENT_MISSING" });
    expect(missing).toContain(`type=${INSTRUMENT_PHYSICAL_DOOR_ID}`);

    expect(cssdSuCoInstrumentHref({ type: SET_RECONCILE_TYPE_ID })).toContain(
      `type=${SET_RECONCILE_TYPE_ID}`,
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

  it("builds batch-recall deep link (QT.24) with lo_tiet_khuan_id and reason", () => {
    const href = cssdSuCoBatchRecallHref({
      loTietKhuanId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      maLo: "LOT-2026-01",
      reason: "BI_POSITIVE",
    });
    expect(href).toContain(`${CSSD_ROUTES.suCo}?`);
    expect(href).toContain("group=PROCESS");
    expect(href).toContain("entry=batch-recall");
    expect(href).toContain("type=PROCESS_BI_POSITIVE");
    expect(href).toContain("reason=BI_POSITIVE");
    expect(href).toContain("loTietKhuanId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(href).toContain("maLo=LOT-2026-01");
    expect(href).not.toContain("group=INSTRUMENT");

    const wet = cssdSuCoBatchRecallHref({ reason: "WET_PACK" });
    expect(wet).toContain("type=PROCESS_STERILIZATION_FAIL");
    expect(wet).toContain("reason=WET_PACK");

    const machine = cssdSuCoBatchRecallHref({ reason: "MACHINE_FAULT" });
    expect(machine).toContain("type=PROCESS_STERILE_QC_FAIL");
  });
});
