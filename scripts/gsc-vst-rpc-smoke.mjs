#!/usr/bin/env node
/**
 * Smoke GSC/VST dashboard RPC — assert JSON contract trên DB thật.
 *
 * Usage: node scripts/gsc-vst-rpc-smoke.mjs [--linked | --local]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSupabaseQueryOutputArgs } from "./lib/resolve-supabase-query-output.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlFile = join(root, "scripts/sql/gsc-vst-rpc-smoke.sql");
const targetFlag = process.argv.includes("--local") ? "--local" : "--linked";
const { extra: outputArgs, label: outputLabel } = resolveSupabaseQueryOutputArgs(root);

console.log(`smoke:gsc-vst ${targetFlag} (${outputLabel})\n`);

const r = spawnSync(
  "npx",
  ["supabase", "db", "query", targetFlag, "--agent=no", "-f", sqlFile, ...outputArgs],
  { cwd: root, encoding: "utf8", stdio: "inherit" },
);

if (r.status === 0) {
  console.log("\n[smoke:gsc-vst] PASSED");
} else {
  console.error("\n[smoke:gsc-vst] FAILED");
}

process.exit(r.status ?? 1);
