import { describe, expect, it } from "vitest";
import {
  GUEST_STATS_HOME_PATH,
  isGuestStatsOnlyRole,
  isGuestStatsPathAllowed,
  resolvePostLoginPath,
} from "./guest-stats-access";

describe("guest-stats-access", () => {
  it("detects guest role case-insensitively", () => {
    expect(isGuestStatsOnlyRole(["KHACH_THONG_KE_GSTT"])).toBe(true);
    expect(isGuestStatsOnlyRole(["khach_thong_ke_gstt", "ADMIN"])).toBe(true);
    expect(isGuestStatsOnlyRole(["ADMIN"])).toBe(false);
  });

  it("allowlists thong-ke vst/gsc and login only", () => {
    expect(isGuestStatsPathAllowed("/thong-ke/vst")).toBe(true);
    expect(isGuestStatsPathAllowed("/thong-ke/gsc/x")).toBe(true);
    expect(isGuestStatsPathAllowed("/login/forgot-password")).toBe(true);
    expect(isGuestStatsPathAllowed("/thong-ke/cssd")).toBe(false);
    expect(isGuestStatsPathAllowed("/")).toBe(false);
    expect(isGuestStatsPathAllowed("/giam-sat")).toBe(false);
  });

  it("post-login home for guest", () => {
    expect(resolvePostLoginPath(["KHACH_THONG_KE_GSTT"], true)).toBe(GUEST_STATS_HOME_PATH);
    expect(resolvePostLoginPath(["ADMIN"], true)).toBe("/");
  });
});
