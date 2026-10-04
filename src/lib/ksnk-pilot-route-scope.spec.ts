import { afterEach, describe, expect, it } from "vitest";
import {
  isNavHiddenUnderActivePilot,
  isPathBlockedUnderActivePilot,
  isRouteInPilotScope,
  resolvePilotSafeEntryPath,
} from "./ksnk-pilot-route-scope";

const ENV_KEYS = ["KSNK_PILOT_CORE_MODULES", "KSNK_PILOT_FOUR_MODULES"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("ksnk-pilot-route-scope — default (no env)", () => {
  it("does not block routes when pilot flags absent", () => {
    expect(isPathBlockedUnderActivePilot("/bao-cao-tong-hop")).toBe(false);
    expect(isPathBlockedUnderActivePilot("/quan-ly-cong-viec")).toBe(false);
    expect(isPathBlockedUnderActivePilot("/cssd-erp/report")).toBe(false);
    expect(resolvePilotSafeEntryPath()).toBe("/bao-cao-tong-hop");
  });
});

describe("ksnk-pilot-route-scope — four modules", () => {
  it("hides QLCV/CSSD/NKBV nav and keeps entry in scope", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    expect(isNavHiddenUnderActivePilot("cv")).toBe(true);
    expect(isNavHiddenUnderActivePilot("nkbv")).toBe(true);
    expect(isNavHiddenUnderActivePilot("cssd-qt")).toBe(false);
    expect(isRouteInPilotScope("/quan-ly-cong-viec")).toBe(false);
    expect(isRouteInPilotScope("/giam-sat-nkbv")).toBe(false);
    expect(isRouteInPilotScope("/giam-sat")).toBe(true);
    expect(isPathBlockedUnderActivePilot(resolvePilotSafeEntryPath())).toBe(false);
  });
});

describe("ksnk-pilot-route-scope — core modules", () => {
  it("entry path is not blocked under core pilot", () => {
    process.env.KSNK_PILOT_CORE_MODULES = "1";
    expect(isPathBlockedUnderActivePilot("/bao-cao-tong-hop")).toBe(true);
    const home = resolvePilotSafeEntryPath();
    expect(home).toBe("/giam-sat");
    expect(isPathBlockedUnderActivePilot(home)).toBe(false);
  });
});
