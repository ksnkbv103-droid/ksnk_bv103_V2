import { afterEach, describe, expect, it, vi } from "vitest";

describe("trusted-admin-email ADM-05", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns false for everyone when env unset", async () => {
    vi.stubEnv("KSNK_BREAK_GLASS_EMAILS", "");
    const { isTrustedAdminEmail, getBreakGlassEmails } = await import("./trusted-admin-email");
    expect(getBreakGlassEmails()).toEqual([]);
    expect(isTrustedAdminEmail("anyone@example.test")).toBe(false);
  });

  it("matches lower-case from comma-separated env (fake emails only)", async () => {
    vi.stubEnv("KSNK_BREAK_GLASS_EMAILS", " BreakOne@Example.Test , breaktwo@example.test ");
    const { isTrustedAdminEmail, getBreakGlassEmails } = await import("./trusted-admin-email");
    expect(getBreakGlassEmails()).toEqual(["breakone@example.test", "breaktwo@example.test"]);
    expect(isTrustedAdminEmail("BREAKONE@example.test")).toBe(true);
    expect(isTrustedAdminEmail("other@example.test")).toBe(false);
  });

  it("withBreakGlassAdminRole injects ADMIN only when env matches", async () => {
    vi.stubEnv("KSNK_BREAK_GLASS_EMAILS", "breakone@example.test");
    const { withBreakGlassAdminRole } = await import("./trusted-admin-email");
    expect(withBreakGlassAdminRole(["NHAN_VIEN_KSNK"], "breakone@example.test")).toEqual([
      "NHAN_VIEN_KSNK",
      "ADMIN",
    ]);
    expect(withBreakGlassAdminRole(["ADMIN"], "breakone@example.test")).toEqual(["ADMIN"]);
    expect(withBreakGlassAdminRole(["NHAN_VIEN_KSNK"], "other@example.test")).toEqual([
      "NHAN_VIEN_KSNK",
    ]);
  });

  it("withBreakGlassAdminRole is no-op when env empty", async () => {
    vi.stubEnv("KSNK_BREAK_GLASS_EMAILS", "");
    const { withBreakGlassAdminRole } = await import("./trusted-admin-email");
    expect(withBreakGlassAdminRole(["NHAN_VIEN_KSNK"], "breakone@example.test")).toEqual([
      "NHAN_VIEN_KSNK",
    ]);
  });
});
