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

const compatWhitelist = [
  "src/modules/cssd-erp/actions/cssd.actions.ts", // compat re-export — backend audit
];

function filePath(entry) {
  if (typeof entry === "string") return entry;
  return entry?.path ?? entry?.file ?? "";
}

let summary = { unusedExports: 0, unusedFiles: 0 };
let unusedFilePaths = [];
try {
  const out = JSON.parse(r.stdout || "{}");
  const unusedFiles = out.unused_files ?? out.unusedFiles ?? [];
  const unusedExports = out.unused_exports ?? out.unusedExports ?? [];
  summary.unusedFiles = out.summary?.unused_files ?? unusedFiles.length;
  summary.unusedExports = out.summary?.unused_exports ?? unusedExports.length;
  unusedFilePaths = unusedFiles.map(filePath).filter(Boolean);
} catch {
  // fallow có thể in text — vẫn pass warn mode
  if (r.stdout) process.stdout.write(r.stdout.slice(0, 4000));
}

console.log("[dead-code:scan] Summary:", JSON.stringify(summary));
console.log("[dead-code:scan] Whitelist (by design):", compatWhitelist.join(", "));
if (unusedFilePaths.length > 0) {
  console.log("[dead-code:scan] Unused files:");
  for (const p of unusedFilePaths) console.log(`  - ${p}`);
}

if (r.status !== 0 && strict) {
  console.error("[dead-code:scan] STRICT — exit", r.status);
  if (r.stderr) process.stderr.write(r.stderr);
  process.exit(r.status ?? 1);
}

if (r.status !== 0) {
  console.warn("[dead-code:scan] WARN — Fallow exit", r.status, "(set DEAD_CODE_STRICT=1 to fail CI)");
}

console.log("[dead-code:scan] Done.");
