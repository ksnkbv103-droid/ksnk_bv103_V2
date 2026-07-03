#!/usr/bin/env node
/**
 * Dead-code scan wrapper — Fallow + repo allowlist.
 * CI: warn-only unless DEAD_CODE_STRICT=1
 */
import { spawnSync } from "node:child_process";

const strict = process.env.DEAD_CODE_STRICT === "1";

console.log("[dead-code:scan] Fallow dead-code analysis…");
const r = spawnSync("npx", ["fallow", "dead-code", "--format", "json"], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
});

if (r.error) {
  console.error("[dead-code:scan] Fallow không chạy được:", r.error.message);
  process.exit(strict ? 1 : 0);
}

let summary = { unusedExports: 0, unusedFiles: 0 };
try {
  const out = JSON.parse(r.stdout || "{}");
  summary.unusedExports = out.unusedExports?.length ?? out.findings?.length ?? 0;
  summary.unusedFiles = out.unusedFiles?.length ?? 0;
} catch {
  // fallow có thể in text — vẫn pass warn mode
  if (r.stdout) process.stdout.write(r.stdout.slice(0, 4000));
}

const compatWhitelist = [
  "src/modules/cssd-erp/actions/cssd.actions.ts", // compat re-export — backend audit
];

console.log("[dead-code:scan] Summary:", JSON.stringify(summary));
console.log("[dead-code:scan] Whitelist (by design):", compatWhitelist.join(", "));

if (r.status !== 0 && strict) {
  console.error("[dead-code:scan] STRICT — exit", r.status);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exit(r.status ?? 1);
}

if (r.status !== 0) {
  console.warn("[dead-code:scan] WARN — Fallow exit", r.status, "(set DEAD_CODE_STRICT=1 to fail CI)");
}

console.log("[dead-code:scan] Done.");
