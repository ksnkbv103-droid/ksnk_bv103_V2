#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const strict = process.env.ENGINEERING_GATE_STRICT === "1";
const root = process.cwd();
const target = join(root, "src", "modules");

function walk(dir, out = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const p = join(dir, item);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return p.replace(`${root}/`, "");
}

const readActionFiles = walk(target).filter(
  (p) => extname(p) === ".ts" && p.includes("/actions/") && p.endsWith("read.actions.ts"),
);

const violations = [];
for (const file of readActionFiles) {
  const content = readFileSync(file, "utf8");
  const usesFact = /\.from\("fact_/g.test(content);
  if (!usesFact) continue;

  const hasPaging = /\.range\(/g.test(content) || /\.limit\(/g.test(content) || /\.rpc\(/g.test(content);
  const detailOnly = /\.eq\("id"/g.test(content) || /\.single\(/g.test(content) || /\.maybeSingle\(/g.test(content);
  if (!hasPaging && !detailOnly) {
    violations.push({
      type: "FACT_LIST_WITHOUT_PAGING",
      file: rel(file),
      note: "Read action from fact_* appears without range/limit/rpc.",
    });
  }
}

if (!violations.length) {
  console.log("[engineering:gate] PASSED");
  process.exit(0);
}

console.log(`[engineering:gate] Found ${violations.length} potential contract violations`);
for (const v of violations) {
  console.log(`- ${v.type}: ${v.file} :: ${v.note}`);
}

if (strict) {
  console.error("[engineering:gate] FAILED (strict mode)");
  process.exit(2);
}

console.log("[engineering:gate] WARN ONLY (set ENGINEERING_GATE_STRICT=1 to fail)");
process.exit(0);

