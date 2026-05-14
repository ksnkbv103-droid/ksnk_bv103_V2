#!/usr/bin/env node
/**
 * Gợi ý kiểm tra drift layout (BV103 phase D — không chặn CI mặc định).
 * Chạy: npm run layout:drift-check
 * @see docs/specs/working/BV103_LAYOUT_PRIMITIVES.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app"];
const PATTERNS = [
  { re: /rounded-\[32px\]/g, hint: "rounded-2xl / bv103LayoutChrome.panelSurface" },
  { re: /rounded-\[3rem\]/g, hint: "rounded-2xl / panelSurface" },
  { re: /rounded-\[40px\]/g, hint: "rounded-2xl / bv103LayoutChrome" },
  { re: /rounded-\[2\.5rem\]/g, hint: "rounded-2xl" },
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
    else if ([".tsx", ".ts", ".jsx", ".css"].includes(extname(name))) out.push(p);
  }
  return out;
}

let hits = 0;
for (const base of SCAN_DIRS) {
  const abs = join(ROOT, base);
  for (const file of walk(abs)) {
    const text = readFileSync(file, "utf8");
    for (const { re, hint } of PATTERNS) {
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[layout-drift] ${file.replace(ROOT + "/", "")}: ${re} → ${hint} (${m.length})`);
      }
    }
  }
}

if (hits === 0) {
  console.log("[layout-drift] OK — không thấy pattern drift phổ biến.");
} else {
  console.warn(`[layout-drift] Tổng ${hits} khớp — xử lý dần theo module (LEAN).`);
  process.exitCode = 0;
}
