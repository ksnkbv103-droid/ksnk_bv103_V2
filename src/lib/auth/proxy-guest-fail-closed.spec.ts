import { describe, expect, it } from "vitest";
import { GUEST_STATS_HOME_PATH } from "@/lib/auth/guest-stats-access";
import {
  classifyGuestRoleLookup,
  decideGuestProxyAccess,
  guestLookupFailWantsHtmlPage,
} from "@/lib/auth/proxy-guest-role-gate";

describe("classifyGuestRoleLookup", () => {
  it("roles khách → guest", () => {
    expect(
      classifyGuestRoleLookup({
        data: { roles: ["KHACH_THONG_KE_GSTT"] },
        error: null,
      })
    ).toEqual({ kind: "guest" });
  });

  it("roles thường → not_guest", () => {
    expect(
      classifyGuestRoleLookup({
        data: { roles: ["ADMIN", "KSNK"] },
        error: null,
      })
    ).toEqual({ kind: "not_guest" });
  });

  it("không dòng (bootstrap) → not_guest", () => {
    expect(classifyGuestRoleLookup({ data: null, error: null })).toEqual({
      kind: "not_guest",
    });
  });

  it("PostgREST error trả về → lookup_failed", () => {
    expect(
      classifyGuestRoleLookup({
        data: null,
        error: { message: "timeout" },
      })
    ).toEqual({ kind: "lookup_failed" });
  });

  it("throw → lookup_failed", () => {
    expect(
      classifyGuestRoleLookup({
        data: null,
        error: null,
        threw: true,
      })
    ).toEqual({ kind: "lookup_failed" });
  });
});

describe("decideGuestProxyAccess (PA C)", () => {
  it("khách ngoài allowlist → redirect_guest_home", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "guest" },
        pathname: "/giam-sat",
        onLoginRoute: false,
      })
    ).toEqual({ action: "redirect_guest_home" });
  });

  it("khách trên allowlist → allow", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "guest" },
        pathname: GUEST_STATS_HOME_PATH,
        onLoginRoute: false,
      })
    ).toEqual({ action: "allow" });
  });

  it("khách trên /login → redirect_guest_home", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "guest" },
        pathname: "/login",
        onLoginRoute: true,
      })
    ).toEqual({ action: "redirect_guest_home" });
  });

  it("roles thường → allow", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "not_guest" },
        pathname: "/",
        onLoginRoute: false,
      })
    ).toEqual({ action: "allow" });
  });

  it("lookup_failed ngoài allowlist → service_unavailable", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "lookup_failed" },
        pathname: "/",
        onLoginRoute: false,
      })
    ).toEqual({ action: "service_unavailable" });
  });

  it("lookup_failed trên allowlist khách → allow (không vòng redirect)", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "lookup_failed" },
        pathname: GUEST_STATS_HOME_PATH,
        onLoginRoute: false,
      })
    ).toEqual({ action: "allow" });
  });

  it("lookup_failed trên /login → allow", () => {
    expect(
      decideGuestProxyAccess({
        outcome: { kind: "lookup_failed" },
        pathname: "/login",
        onLoginRoute: true,
      })
    ).toEqual({ action: "allow" });
  });
});

describe("guestLookupFailWantsHtmlPage", () => {
  it("GET Accept html → true; POST / API → false", () => {
    expect(guestLookupFailWantsHtmlPage("GET", "text/html,application/xhtml+xml")).toBe(true);
    expect(guestLookupFailWantsHtmlPage("HEAD", "text/html")).toBe(true);
    expect(guestLookupFailWantsHtmlPage("POST", "text/html")).toBe(false);
    expect(guestLookupFailWantsHtmlPage("GET", "application/json")).toBe(false);
  });
});
