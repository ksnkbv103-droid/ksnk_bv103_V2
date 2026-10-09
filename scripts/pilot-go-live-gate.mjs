#!/usr/bin/env node
/**
 * In checklist sign-off sau automated gates (Phase 6).
 * Usage: node scripts/pilot-go-live-gate.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const signoff = join(root, "docs/core/pilot-core-modules-go-live.md");

console.log("\n=== Pilot go-live gate (automated portion OK) ===\n");
console.log("Go-live SSOT:", signoff.replace(root + "/", ""));
console.log("\nNext steps:");
console.log("  1. Kiểm tra tiêu chí go-live trong docs/core/pilot-core-modules-go-live.md");
console.log("  2. trial:auth:precheck → mdm_email_no_auth = 0 (auth-pilot-link-sop.md)");
console.log("  3. Chọn wave env KSNK_PILOT_CORE_MODULES (pilot-core-modules-go-live.md)");
console.log("  4. Production: npm run pilot:ship (nếu chưa chạy migrate trên prod)\n");

try {
  const head = readFileSync(signoff, "utf8").split("\n").slice(0, 8).join("\n");
  console.log("--- Go-live doc (excerpt) ---\n" + head + "\n...\n");
} catch {
  console.warn("Warning: go-live doc not found at", signoff);
}
