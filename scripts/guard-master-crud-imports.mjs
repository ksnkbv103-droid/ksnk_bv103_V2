#!/usr/bin/env node
/**
 * Chỉ cho phép import master-crud-core từ actions trong module quan-tri-he-thong (+ bang-kiem/nhan-su).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, "src");
const needle = "master-crud-core";

const allowed = [
  /src\/modules\/quan-tri-he-thong\/danh-muc\/actions\//,
  /src\/modules\/quan-tri-he-thong\/bang-kiem\/actions\//,
  /src\/modules\/quan-tri-he-thong\/nhan-su\/actions\//,
];

function walk(dir, out = []) {
  for (const item of readdirSync(dir)) {
    const p = join(dir, item);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(target)) {
  if (file.includes("master-crud-core.ts")) continue;
  const content = readFileSync(file, "utf8");
  if (!content.includes(needle)) continue;
  const rel = file.replace(`${root}/`, "");
  if (!allowed.some((re) => re.test(rel))) {
    violations.push(rel);
  }
}

if (!violations.length) {
  console.log("imports:master-crud OK");
  process.exit(0);
}

console.error("imports:master-crud FAILED — import master-crud-core chỉ từ quan-tri-he-thong/*/actions:");
for (const v of violations) console.error(`  - ${v}`);
process.exit(1);
