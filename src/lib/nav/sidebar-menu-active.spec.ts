import { describe, expect, it } from "vitest";
import { menuItemIsActive } from "./sidebar-menu-active";

describe("menuItemIsActive — CSSD report lights Quy trình", () => {
  it("activates Quy trình for /cssd-erp/report", () => {
    expect(menuItemIsActive("/cssd-erp/report", "/cssd-quy-trinh", null)).toBe(true);
    expect(menuItemIsActive("/cssd-erp/batch", "/cssd-quy-trinh", null)).toBe(true);
    expect(menuItemIsActive("/cssd-quy-trinh", "/cssd-quy-trinh", null)).toBe(true);
    expect(menuItemIsActive("/cssd-su-co", "/cssd-quy-trinh", null)).toBe(false);
  });
});
