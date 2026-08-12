import { describe, expect, it } from "vitest";
import {
  canThiepDatesForPanel,
  collectDeviceMilestones,
  deviceKeyForPanel,
  isDeviceDateInStay,
  validateDeviceRegistryDates,
} from "./nkbv-ba-device-timeline";
import type { BaTimelineMilestone } from "./nkbv-ba-timeline-core";
import { deviceAssociationFromCanThiepDates } from "./nkbv-shared-timeline";

describe("nkbv-ba-device-timeline", () => {
  it("isDeviceDateInStay: chặn trước VV / sau RV", () => {
    expect(isDeviceDateInStay("2026-08-09", "2026-08-10").ok).toBe(false);
    expect(isDeviceDateInStay("2026-08-10", "2026-08-10").ok).toBe(true);
    expect(
      isDeviceDateInStay("2026-08-12", "2026-08-10", "2026-08-11").ok,
    ).toBe(false);
    expect(
      isDeviceDateInStay("2026-08-11", "2026-08-10", "2026-08-11").ok,
    ).toBe(true);
  });

  it("validateDeviceRegistryDates: rút ≥ đặt; cảnh báo đặt trước VV", () => {
    expect(
      validateDeviceRegistryDates({
        insertionDate: "2026-08-10",
        removalDate: "2026-08-09",
      }).ok,
    ).toBe(false);
    const pre = validateDeviceRegistryDates({
      insertionDate: "2026-08-08",
      admissionDate: "2026-08-10",
    });
    expect(pre.ok).toBe(true);
    expect(pre.warnPreAdmission).toBe(true);
  });

  it("maps panel → criteria key", () => {
    expect(deviceKeyForPanel("UTI")).toBe("device_foley");
    expect(deviceKeyForPanel("PNEU")).toBe("device_ventilator");
    expect(deviceKeyForPanel("BSI")).toBe("device_central_line");
    expect(deviceKeyForPanel("SSI")).toBeNull();
  });

  it("collect + canThiepDatesForPanel from milestones", () => {
    const milestones: BaTimelineMilestone[] = [
      {
        id: "a",
        date: "2026-08-01",
        kind: "SYMPTOM",
        title: "Foley",
        source: "MANUAL",
        criteriaKey: "device_foley",
        detail: null,
        majorType: "UTI",
        gate: null,
      },
      {
        id: "b",
        date: "2026-08-02",
        kind: "SYMPTOM",
        title: "Foley",
        source: "MANUAL",
        criteriaKey: "device_foley",
        detail: null,
        majorType: "UTI",
        gate: null,
      },
      {
        id: "c",
        date: "2026-08-03",
        kind: "SYMPTOM",
        title: "Foley",
        source: "MANUAL",
        criteriaKey: "device_foley",
        detail: null,
        majorType: "UTI",
        gate: null,
      },
    ];
    const by = collectDeviceMilestones(milestones);
    const dates = canThiepDatesForPanel(by, "UTI");
    expect(dates).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    const assoc = deviceAssociationFromCanThiepDates(dates, "2026-08-03");
    expect(assoc.associated).toBe(true);
    expect(assoc.placedDays).toBe(3);
  });

  it("1 ngày Foley → không gắn CAUTI", () => {
    const assoc = deviceAssociationFromCanThiepDates(["2026-08-10"], "2026-08-10");
    expect(assoc.associated).toBe(false);
    expect(assoc.placedDays).toBe(1);
  });
});
