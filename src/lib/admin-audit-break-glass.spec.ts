import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Break-glass audit phải await — void bị hủy trên serverless khi action trả sớm. */
const BREAK_GLASS_AUDIT_CALL_SITES = [
  "src/lib/server-permission.ts",
  "src/lib/auth/quan-tri-access.ts",
  "src/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers.ts",
] as const;

describe("break-glass admin audit await", () => {
  it.each(BREAK_GLASS_AUDIT_CALL_SITES)("%s awaits logAdminAction", (rel) => {
    const src = readFileSync(join(process.cwd(), rel), "utf8");
    expect(src).not.toMatch(/void\s+logAdminAction\s*\(/);
    expect(src).toMatch(/await\s+logAdminAction\s*\(/);
  });
});
