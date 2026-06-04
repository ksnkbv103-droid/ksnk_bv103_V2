#!/usr/bin/env node
/** Migrate text-[8px]/text-[9px] → text-[11px] in src/ */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

let files = 0;
let replacements = 0;
for (const file of walk(ROOT)) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(/text-\[8px\]/g, "text-[11px]").replace(/text-\[9px\]/g, "text-[11px]");
  if (after !== before) {
    writeFileSync(file, after);
    files++;
    replacements += (before.match(/text-\[(8|9)px\]/g) || []).length;
  }
}
console.log(`[codemod-typography] ${files} files, ${replacements} replacements`);
