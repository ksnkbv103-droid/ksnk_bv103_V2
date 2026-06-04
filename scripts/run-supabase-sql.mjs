#!/usr/bin/env node
/**
 * Chạy một file SQL qua `supabase db query` với output flag tương thích CLI.
 *
 * Usage: node scripts/run-supabase-sql.mjs (--local | --linked) --file path.sql
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSupabaseQueryOutputArgs } from "./lib/resolve-supabase-query-output.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const targetFlag = args.includes("--local") ? "--local" : "--linked";
const fileIdx = args.indexOf("--file");
const sqlFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

if (!sqlFile) {
  console.error("Usage: node scripts/run-supabase-sql.mjs (--local|--linked) --file <path.sql>");
  process.exit(1);
}

const { extra: outputArgs } = resolveSupabaseQueryOutputArgs(root);
const r = spawnSync(
  "npx",
  ["supabase", "db", "query", targetFlag, "--agent=no", "-f", sqlFile, ...outputArgs],
  { cwd: root, encoding: "utf8", stdio: "inherit" },
);
process.exit(r.status ?? 1);
