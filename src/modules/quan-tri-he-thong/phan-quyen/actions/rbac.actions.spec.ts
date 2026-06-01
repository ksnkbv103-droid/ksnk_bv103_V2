import { describe, expect, it } from "vitest";

describe("rbac.actions", () => {
  it("exports matrix actions", async () => {
    const mod = await import("./rbac.actions");
    expect(typeof mod.getRBACData).toBe("function");
    expect(typeof mod.saveFullRBACMatrix).toBe("function");
    expect(typeof mod.syncPermissionRegistry).toBe("function");
  });
});
