import { describe, expect, it } from "vitest";
import {
  isNavHiddenUnderPilotCoreModules,
  isPathBlockedUnderPilotCoreModules,
} from "./ksnk-pilot-core-modules-scope";

describe("ksnk-pilot-core-modules-scope", () => {
  it("blocks CSSD and NKBV routes", () => {
    expect(isPathBlockedUnderPilotCoreModules("/cssd-quy-trinh")).toBe(true);
    expect(isPathBlockedUnderPilotCoreModules("/giam-sat-nkbv")).toBe(true);
    expect(isPathBlockedUnderPilotCoreModules("/bao-cao-tong-hop")).toBe(true);
  });

  it("allows supervision and QLCV", () => {
    expect(isPathBlockedUnderPilotCoreModules("/giam-sat-vst")).toBe(false);
    expect(isPathBlockedUnderPilotCoreModules("/giam-sat-chung")).toBe(false);
    expect(isPathBlockedUnderPilotCoreModules("/quan-ly-cong-viec")).toBe(false);
    expect(isPathBlockedUnderPilotCoreModules("/quan-tri-he-thong")).toBe(false);
  });

  it("hides dashboard and CSSD nav gates", () => {
    expect(isNavHiddenUnderPilotCoreModules("dash")).toBe(true);
    expect(isNavHiddenUnderPilotCoreModules("cssd-qt")).toBe(true);
    expect(isNavHiddenUnderPilotCoreModules("vst")).toBe(false);
  });
});
