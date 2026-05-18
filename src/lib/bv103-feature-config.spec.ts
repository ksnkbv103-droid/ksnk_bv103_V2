import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isComplianceDashboardMultiV2Enabled,
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

  it("defaults multi v2 on", () => {
    delete process.env.BV103_COMPLIANCE_MULTI_V2;
    expect(isComplianceDashboardMultiV2Enabled()).toBe(true);
  });

  it("can disable multi v2", () => {
    process.env.BV103_COMPLIANCE_MULTI_V2 = "0";
    expect(isComplianceDashboardMultiV2Enabled()).toBe(false);
  });

  it("dashboard stale time fallback", () => {
    process.env.BV103_DASHBOARD_QUERY_STALE_MS = "120000";
    expect(dashboardQueryStaleTimeMs()).toBe(120_000);
  });

  it("module disabled under pilot four", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    delete process.env.KSNK_MODULE_CSSD;
    expect(isModuleEnabled("CSSD")).toBe(false);
  });
});
