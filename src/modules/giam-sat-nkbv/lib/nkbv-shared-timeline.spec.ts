import { describe, expect, it } from "vitest";
import {
  clinicalIwp,
  clinicalRitEnd,
  clinicalSbapWindow,
  daysBetween,
  deviceAssociationFromCanThiepDates,
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

    // Đặt 01–02, rút 02, DOE 03: hiện diện Day−1 nhưng chỉ 2 ngày mang → không gắn
    const removedDayBeforeShort = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-02",
      doe: "2026-08-03",
    });
    expect(removedDayBeforeShort.activeOnEvent).toBe(true);
    expect(removedDayBeforeShort.placedDays).toBe(2);
    expect(removedDayBeforeShort.associated).toBe(false);

    // Đặt 01–03, rút 03 (=DOE): đủ 3 ngày
    const removedOnDoe = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-03",
      doe: "2026-08-03",
    });
    expect(removedOnDoe.associated).toBe(true);

    // Đặt 01–03, rút 03 (=DOE−1), DOE 04: đủ 3 ngày + Day−1
    const removedDayBeforeOk = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-03",
      doe: "2026-08-04",
    });
    expect(removedDayBeforeOk.activeOnEvent).toBe(true);
    expect(removedDayBeforeOk.placedDays).toBe(3);
    expect(removedDayBeforeOk.associated).toBe(true);

    // Rút sau DOE — vẫn hiện diện lúc DOE
    const removedAfter = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-10",
      doe: "2026-08-05",
    });
    expect(removedAfter.activeOnEvent).toBe(true);
    expect(removedAfter.associated).toBe(true);

    // Rút DOE−2 — không hiện diện
    const removedTooEarly = isDeviceAssociated({
      placedDate: "2026-08-01",
      removedDate: "2026-08-03",
      doe: "2026-08-05",
    });
    expect(removedTooEarly.activeOnEvent).toBe(false);
    expect(removedTooEarly.associated).toBe(false);
  });

  it("1 ngày can thiệp hoặc gap ≥1 ngày → không gắn; sổ không phình khi lưới đã tick", () => {
    const oneDay = deviceAssociationFromCanThiepDates(["2026-08-10"], "2026-08-10", {
      placedDate: "2026-08-01", // sổ dài — bị bỏ qua vì lưới có ngày
      removedDate: null,
    });
    expect(oneDay.placedDays).toBe(1);
    expect(oneDay.associated).toBe(false);

    const gapped = deviceAssociationFromCanThiepDates(
      ["2026-08-01", "2026-08-02", "2026-08-05"],
      "2026-08-05",
    );
    expect(gapped.episodeStart).toBe("2026-08-05");
    expect(gapped.placedDays).toBe(1);
    expect(gapped.associated).toBe(false);

    const continuous = deviceAssociationFromCanThiepDates(
      ["2026-08-01", "2026-08-02", "2026-08-03"],
      "2026-08-03",
    );
    expect(continuous.associated).toBe(true);
    expect(continuous.placedDays).toBe(3);
  });

  it("ngày can thiệp trước vào viện bị loại; Day 1 = VV", () => {
    // Tick VV−2…DOE nhưng VV = 08-03 → chỉ đếm từ 03
    const pre = deviceAssociationFromCanThiepDates(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"],
      "2026-08-05",
      { admissionDate: "2026-08-03" },
    );
    expect(pre.episodeStart).toBe("2026-08-03");
    expect(pre.placedDays).toBe(3);
    expect(pre.associated).toBe(true);

    // Chỉ còn tick trước VV → không gắn
    const onlyPre = deviceAssociationFromCanThiepDates(
      ["2026-08-01", "2026-08-02"],
      "2026-08-05",
      { admissionDate: "2026-08-03" },
    );
    expect(onlyPre.associated).toBe(false);
    expect(onlyPre.placedDays).toBe(0);

    // Sổ đặt trước viện → clamp Day 1 = VV
    const registry = deviceAssociationFromCanThiepDates([], "2026-08-05", {
      placedDate: "2026-08-01",
      admissionDate: "2026-08-03",
    });
    expect(registry.placedDays).toBe(3);
    expect(registry.associated).toBe(true);
    expect(registry.episodeStart).toBe("2026-08-03");
  });

  it("RIT end is DOE+13", () => {
    expect(clinicalRitEnd("2026-08-10")).toBe("2026-08-23");
  });
});
