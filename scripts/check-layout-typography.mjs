#!/usr/bin/env node
/**
 * Cảnh báo typography drift — label dưới 11px.
 * Chạy: npm run layout:typography-check
 * @see docs/modules/giam-sat/layout-primitives.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app"];
/** Cho phép tạm trong file đã lên kế hoạch migrate — giảm dần. */
const ALLOWLIST = new Set([]);

const PATTERNS = [
  { re: /text-\[8px\]/g, hint: "text-[11px] / bv103DesignTokens.labelBlock" },
  { re: /text-\[9px\]/g, hint: "text-[11px] / bv103DesignTokens.labelBlockMuted" },
];

function walk(dir, out = []) {
  let st;
  try {
    st = statSync(dir);
  } catch {
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if ([".tsx", ".ts"].includes(extname(name))) out.push(p);
  }
  return out;
}

let hits = 0;
for (const base of SCAN_DIRS) {
  const abs = join(ROOT, base);
  for (const file of walk(abs)) {
    const rel = file.replace(ROOT + "/", "");
    if (ALLOWLIST.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    for (const { re, hint } of PATTERNS) {
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[typography-drift] ${rel}: ${re} → ${hint} (${m.length})`);
      }
    }
  }
}

if (hits === 0) {
  console.log("[typography-drift] OK — không thấy text-[8px]/text-[9px] ngoài allowlist.");
} else {
  console.error(`[typography-drift] FAIL — ${hits} khớp text-[8px]/text-[9px]. Chạy: node scripts/codemod-typography-min-label.mjs`);
  process.exitCode = 1;
}
