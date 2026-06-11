#!/usr/bin/env node
/**
 * Gate: *Panel*, *Form*, *Modal* phải import chrome SSOT.
 * Chạy: npm run panel:chrome-check
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEEDLE =
  /bv103PanelChrome|bv103LayoutChrome|bv103DesignTokens|quanTriFormChrome|gscFormChrome|nkbvFormChrome|dashboardChrome|cssd-ui-chrome|CSSD_UI_PANEL|qlcvTableChrome|-form-chrome|-table-chrome/;

const SKIP = new Set([
  "src/modules/giam-sat-chung/components/GiamSatChungForm.tsx",
  "src/modules/giam-sat-vst/components/VSTForm.tsx",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/Panel|Form|Modal/i.test(name) && name.endsWith(".tsx") && !name.includes("columns")) out.push(p);
  }
  return out;
}

let misses = 0;
for (const file of walk(join(ROOT, "src"))) {
  const rel = file.replace(ROOT + "/", "");
  if (SKIP.has(rel) || rel.endsWith(".spec.tsx")) continue;
  const text = readFileSync(file, "utf8");
  if (!NEEDLE.test(text)) {
    misses++;
    console.warn(`[panel-form-chrome] ${rel}: thiếu import chrome`);
  }
}

if (misses === 0) {
  console.log("[panel-form-chrome] OK — panel/form/modal import chrome.");
} else {
  console.warn(`[panel-form-chrome] ${misses} file thiếu chrome.`);
  process.exitCode = 1;
}
