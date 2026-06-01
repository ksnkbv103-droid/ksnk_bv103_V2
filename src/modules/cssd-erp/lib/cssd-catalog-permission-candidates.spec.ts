import { describe, expect, it } from "vitest";
import { CSSD_KHO_CATALOG_PERMISSION_CANDIDATES } from "./cssd-catalog-permission-candidates";

describe("cssd-catalog-permission-candidates", () => {
  it("includes view fallback on CSSD_KHO_DUNGCU", () => {
    expect(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES[0]).toEqual(["CSSD_KHO_DUNGCU", "view"]);
    expect(CSSD_KHO_CATALOG_PERMISSION_CANDIDATES.some(([m]) => m === "CSSD_WORKFLOW")).toBe(true);
  });
});
