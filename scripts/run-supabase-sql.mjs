#!/usr/bin/env node
/**
 * Chạy một file SQL qua `supabase db query` với output flag tương thích CLI.
 *
 * Local: ưu tiên `--db-url` Postgres trực tiếp (tránh Docker CLI / TCC trên docker.sock).
 * HOME tạm để tránh EPERM ghi `~/.supabase/telemetry.json` từ Cursor sandbox.
 *
 * Usage: node scripts/run-supabase-sql.mjs (--local | --linked) --file path.sql
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSupabaseQueryOutputArgs } from "./lib/resolve-supabase-query-output.mjs";

const LOCAL_DB_URL =
  process.env.SUPABASE_LOCAL_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const useLocal = args.includes("--local");
const targetFlag = useLocal ? "--local" : "--linked";
const fileIdx = args.indexOf("--file");
const sqlFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

if (!sqlFile) {
  console.error("Usage: node scripts/run-supabase-sql.mjs (--local|--linked) --file <path.sql>");
  process.exit(1);
}

const home = mkdtempSync(join(tmpdir(), "ksnk-supabase-home-"));
mkdirSync(join(home, ".supabase"), { recursive: true });
const childEnv = {
  ...process.env,
  HOME: home,
  SUPABASE_INTERNAL_DISABLE_TELEMETRY: "1",
};

const { extra: outputArgs } = resolveSupabaseQueryOutputArgs(root);
const queryArgs = useLocal
  ? ["supabase", "db", "query", "--db-url", LOCAL_DB_URL, "--agent=no", "-f", sqlFile, ...outputArgs]
  : ["supabase", "db", "query", targetFlag, "--agent=no", "-f", sqlFile, ...outputArgs];

const r = spawnSync("npx", queryArgs, {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  env: childEnv,
});
process.exit(r.status ?? 1);
