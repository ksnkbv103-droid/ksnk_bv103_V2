#!/usr/bin/env node
/**
 * Audit public views: usage in src/ vs supabase/ vs unused.
 * Usage: node scripts/audit-view-usage.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".git") continue;
    const st = statSync(p);
    if (st.isDirectory()) listFiles(p, acc);
    else if (/\.(ts|tsx|sql|mjs|js)$/.test(name)) acc.push(p);
  }
  return acc;
}

const views = execSync(
  `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -t -A -c "SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY 1;"`,
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

const srcFiles = listFiles(join(ROOT, "src"));
const sqlFiles = [
  ...listFiles(join(ROOT, "supabase")),
  ...listFiles(join(ROOT, "scripts")).filter((f) => !f.includes("audit-view-usage")),
];

function scan(files, view) {
  const hits = [];
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    if (t.includes(view)) hits.push(f.replace(ROOT + "/", ""));
  }
  return hits;
}

const unused = [];
const sqlOnly = [];
const both = [];
const srcOnly = [];

for (const v of views) {
  const sh = scan(srcFiles, v);
  const qh = scan(sqlFiles, v);
  if (sh.length === 0 && qh.length === 0) unused.push(v);
  else if (sh.length === 0) sqlOnly.push({ v, sql: qh.length });
  else if (qh.length === 0) srcOnly.push({ v, src: sh.length });
  else both.push(v);
}

console.log(JSON.stringify({ total: views.length, unused, sqlOnly: sqlOnly.map((x) => x.v), counts: { unused: unused.length, sqlOnly: sqlOnly.length, both: both.length, srcOnly: srcOnly.length } }, null, 2));
