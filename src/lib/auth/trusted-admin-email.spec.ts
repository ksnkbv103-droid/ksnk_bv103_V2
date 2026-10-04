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
});
