#!/usr/bin/env node
/**
 * Liệt kê RPC trong baseline không còn caller trong src/ (post-D-13).
 * Chạy: npm run audit:legacy-rpc
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = join(ROOT, "supabase/migrations");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|sql|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const migrationSql = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIG_DIR, f), "utf8"))
  .join("\n");

const rpcNames = [
  ...migrationSql.matchAll(/(?:CREATE OR REPLACE )?FUNCTION public\.(rpc_[a-z0-9_]+)/gi),
  ...migrationSql.matchAll(/(?:CREATE OR REPLACE )?FUNCTION "public"\."(rpc_[^"]+)"/gi),
].map((m) => m[1]);

const dropped = [
  ...migrationSql.matchAll(/DROP FUNCTION IF EXISTS public\.(rpc_[a-z0-9_]+)/gi),
].map((m) => m[1]);

const activeRpc = [...new Set(rpcNames)].filter((n) => !dropped.includes(n)).sort();

const srcFiles = walk(join(ROOT, "src"));
const sqlFiles = walk(MIG_DIR).filter((f) => !f.includes("20260530000000_init"));
const corpus = [...srcFiles, ...sqlFiles].map((f) => readFileSync(f, "utf8")).join("\n");

const unused = activeRpc.filter((name) => !corpus.includes(name));

console.log(`[audit:legacy-rpc] Active RPC (after DROP migrations): ${activeRpc.length}`);
console.log(`[audit:legacy-rpc] No src reference: ${unused.length}`);
if (unused.length) {
  for (const n of unused) console.log(`  - ${n}`);
}
