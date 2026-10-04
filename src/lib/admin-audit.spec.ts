import { describe, expect, it } from "vitest";
import { maskEmailForAudit } from "./admin-audit";

describe("admin-audit helper", () => {
  it("masks email for audit payload", () => {
    expect(maskEmailForAudit("alice@example.test")).toBe("a***@example.test");
    expect(maskEmailForAudit("")).toBe("");
  });
});
