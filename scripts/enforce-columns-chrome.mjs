#!/usr/bin/env node
/**
 * Gate adoption: mọi *-columns*.tsx phải import *-table-chrome / *-ui-chrome / dashboard-chrome.
 * Chạy: node scripts/enforce-columns-chrome.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME_NEEDLE =
  /table-chrome|ui-chrome|dashboard-chrome|quanTriTableChrome|gscTableChrome|qlcvTableChrome|CSSD_UI_CELL|dashboardChrome\.cell/;

const SKIP = new Set([
  "src/modules/quan-tri-he-thong/bang-kiem/components/tieu-chi-table-columns.tsx",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.includes("columns") && name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let misses = 0;
for (const file of walk(join(ROOT, "src"))) {
  const rel = file.replace(ROOT + "/", "");
  if (SKIP.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  if (!CHROME_NEEDLE.test(text)) {
    misses++;
    console.warn(`[columns-chrome] ${rel}: thiếu import table/ui chrome`);
  }
}

if (misses === 0) {
  console.log("[columns-chrome] OK — mọi file columns import chrome.");
} else {
  console.warn(`[columns-chrome] ${misses} file thiếu chrome.`);
  process.exitCode = 1;
}
