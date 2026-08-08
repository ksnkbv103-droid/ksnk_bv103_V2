import { describe, expect, it } from "vitest";
import {
  clinicalIwp,
  clinicalRitEnd,
  clinicalSbapWindow,
  daysBetween,
  isDeviceAssociated,
  poaOrHai,
  ssiSbapWindow,
  usesClinicalIwp,
  vaeEventPeriod,
} from "./nkbv-shared-timeline";

describe("nkbv-shared-timeline", () => {
  it("builds clinical IWP ±3", () => {
    expect(clinicalIwp("2026-08-10")).toEqual({
      start: "2026-08-07",
      end: "2026-08-13",
    });
  });

  it("SSI SBAP is 17 days DOE-3..DOE+13", () => {
    expect(ssiSbapWindow("2026-08-10")).toEqual({
      start: "2026-08-07",
      end: "2026-08-23",
    });
  });

  it("clinical SBAP: DOE = Index → length 17, start Index−3, end Index+13", () => {
    const index = "2026-08-10";
    const w = clinicalSbapWindow(index, index);
    expect(w).toEqual({ start: "2026-08-07", end: "2026-08-23" });
    expect(daysBetween(w.start, w.end) + 1).toBe(17);
  });

  it("clinical SBAP: DOE = Index−3 → length 14, start = DOE", () => {
    const index = "2026-08-10";
    const doe = "2026-08-07"; // Index−3
    const w = clinicalSbapWindow(index, doe);
    expect(w.start).toBe(doe);
    expect(w.end).toBe("2026-08-20"); // DOE+13
    expect(daysBetween(w.start, w.end) + 1).toBe(14);
  });

  it("SSI SBAP unchanged vs clinical when DOE≠Index", () => {
    const doe = "2026-08-07";
    const index = "2026-08-10";
    expect(ssiSbapWindow(doe)).toEqual({
      start: "2026-08-04",
      end: "2026-08-20",
    });
    expect(clinicalSbapWindow(index, doe)).toEqual({
      start: "2026-08-07",
      end: "2026-08-20",
    });
    expect(ssiSbapWindow(doe)).not.toEqual(clinicalSbapWindow(index, doe));
  });

  it("VAE event period is 14 days from DOE", () => {
    expect(vaeEventPeriod("2026-08-10")).toEqual({
      start: "2026-08-10",
      end: "2026-08-23",
    });
  });

  it("marks clinical IWP applicability", () => {
    expect(usesClinicalIwp("CLABSI")).toBe(true);
    expect(usesClinicalIwp("VAE")).toBe(false);
    expect(usesClinicalIwp("SSI")).toBe(false);
  });

  it("POA vs HAI by hospital day", () => {
    expect(poaOrHai("2026-08-01", "2026-08-02").haiStatus).toBe("POA");
    expect(poaOrHai("2026-08-01", "2026-08-03").haiStatus).toBe("HAI");
  });

  it("device association needs ≥3 placed days and active on DOE/DOE-1", () => {
    const ok = isDeviceAssociated({
      placedDate: "2026-08-01",
      doe: "2026-08-03",
    });
    expect(ok.associated).toBe(true);
    expect(ok.placedDays).toBe(3);

    const removedDayBefore = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-02",
      doe: "2026-08-03",
    });
    expect(removedDayBefore.activeOnEvent).toBe(true);
  });

  it("RIT end is DOE+13", () => {
    expect(clinicalRitEnd("2026-08-10")).toBe("2026-08-23");
  });
});
