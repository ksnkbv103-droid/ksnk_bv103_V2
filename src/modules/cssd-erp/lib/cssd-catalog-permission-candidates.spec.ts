import { describe, expect, it } from "vitest";
import { CSSD_KHO_CATALOG_PERMISSION_CANDIDATES } from "./cssd-catalog-permission-candidates";

describe("cssd-catalog-permission-candidates", () => {
  it("starts with CSSD_KHO_DUNGCU.view and stays on kho module only", () => {
    expect(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES[0]).toEqual(["CSSD_KHO_DUNGCU", "view"]);
    expect(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES.every(([m]) => m === "CSSD_KHO_DUNGCU")).toBe(true);
    expect(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES.some(([m]) => m === "CSSD_WORKFLOW")).toBe(false);
  });

  it("covers kho read/write import actions used as soft-OR", () => {
    const actions = new Set(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES.map(([, a]) => a));
    expect(actions.has("view")).toBe(true);
    expect(actions.has("edit")).toBe(true);
    expect(actions.has("create")).toBe(true);
    expect(actions.has("import")).toBe(true);
  });
});
