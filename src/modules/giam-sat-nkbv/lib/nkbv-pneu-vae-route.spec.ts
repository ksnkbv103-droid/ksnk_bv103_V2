import { describe, expect, it } from "vitest";
import {
  isAdultVaeInPlan,
  isKnownPatientAge,
  MISSING_DOB_NO_EVENT_REASON,
} from "./nkbv-pneu-vae-route";

describe("nkbv-pneu-vae-route L02/20b", () => {
  it("thiếu tuổi → không known; không VAE in-plan", () => {
    expect(isKnownPatientAge(null)).toBe(false);
    expect(isKnownPatientAge(undefined)).toBe(false);
    expect(isAdultVaeInPlan(null, 10)).toBe(false);
    expect(isAdultVaeInPlan(undefined, 10)).toBe(false);
  });
  it("adult + vent ≥4 → VAE in-plan", () => {
    expect(isKnownPatientAge(45)).toBe(true);
    expect(isAdultVaeInPlan(45, 4)).toBe(true);
    expect(isAdultVaeInPlan(17, 10)).toBe(false);
  });
  it("message DoD cố định", () => {
    expect(MISSING_DOB_NO_EVENT_REASON).toBe("Thiếu ngày sinh — không xác định ca");
  });
});
