import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  dashboardQueryStaleTimeMs,
  isModuleEnabled,
} from "./bv103-feature-config";

describe("bv103-feature-config", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("dashboard stale time fallback", () => {
    process.env.BV103_DASHBOARD_QUERY_STALE_MS = "120000";
    expect(dashboardQueryStaleTimeMs()).toBe(120_000);
  });

  it("module disabled under pilot four", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    delete process.env.KSNK_MODULE_QLCV;
    delete process.env.KSNK_MODULE_CSSD;
    expect(isModuleEnabled("CSSD")).toBe(false);
  });

  it("QLCV enabled under pilot core", () => {
    process.env.KSNK_PILOT_CORE_MODULES = "1";
    delete process.env.KSNK_MODULE_QLCV;
    expect(isModuleEnabled("QLCV")).toBe(true);
    expect(isModuleEnabled("CSSD")).toBe(false);
  });
});
