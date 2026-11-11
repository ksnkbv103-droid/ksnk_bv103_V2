import { describe, expect, it } from "vitest";
import { canSelfLinkByEmail } from "./account-link-policy";

describe("canSelfLinkByEmail (QT-003)", () => {
  it("tự đăng ký, email đã xác nhận, chưa duyệt -> false", () => {
    expect(canSelfLinkByEmail({ email_confirmed_at: "2026-11-11", app_metadata: { provider: "email" } })).toBe(false);
  });
  it("ADMIN duyệt nhưng email chưa xác nhận -> false", () => {
    expect(canSelfLinkByEmail({ email_confirmed_at: null, app_metadata: { admin_provisioned: true } })).toBe(false);
  });
  it("ADMIN duyệt + email xác nhận -> true", () => {
    expect(canSelfLinkByEmail({ email_confirmed_at: "2026-11-11", app_metadata: { admin_provisioned: true } })).toBe(true);
  });
  it("null/thiếu metadata -> false", () => {
    expect(canSelfLinkByEmail(null)).toBe(false);
    expect(canSelfLinkByEmail({ email_confirmed_at: "x" })).toBe(false);
  });
});
