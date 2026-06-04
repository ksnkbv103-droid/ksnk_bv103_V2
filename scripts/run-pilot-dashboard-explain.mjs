#!/usr/bin/env node
/**
 * Chạy EXPLAIN từng RPC dashboard (một statement/file).
 * Usage: node scripts/run-pilot-dashboard-explain.mjs [--linked | --local]
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSupabaseQueryOutputArgs } from "./lib/resolve-supabase-query-output.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlDir = join(root, "scripts/sql/pilot-dashboard-explain");
const targetFlag = process.argv.includes("--linked")
  ? "--linked"
  : process.argv.includes("--local")
    ? "--local"
    : "--linked";

const { extra: outputArgs, label: outputLabel } =
  resolveSupabaseQueryOutputArgs(root);
const files = readdirSync(sqlDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No SQL files in", sqlDir);
  process.exit(1);
}

console.log(
  `pilot:dashboard:explain ${targetFlag} (${outputLabel}, ${files.length} RPC)\n`,
);

let failed = 0;
for (const file of files) {
  const path = join(sqlDir, file);
  console.log(`--- ${file} ---`);
  const r = spawnSync(
    "npx",
    [
      "supabase",
      "db",
      "query",
      targetFlag,
      "--agent=no",
      "-f",
      path,
      ...outputArgs,
    ],
    { cwd: root, encoding: "utf8", stdio: "inherit" },
  );
  if (r.status !== 0) failed += 1;
  console.log("");
}

process.exit(failed > 0 ? 1 : 0);
