#!/usr/bin/env node
/**
 * Cổng typography BV103 — 5 vai trò chữ, không siêu đậm / nghiêng / < 11px.
 * Chạy: npm run layout:typography-check
 * @see docs/reference/guides/bv103-visual-language.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app", "src/hooks", "src/lib"];

/** In ấn A4 + CSS type-note (italic chỉ ở đây). */
const isPrintPath = (rel) =>
  /print|PrintView|PrintLayout|usePrint\.ts|bao-cao-tong-hop-print/i.test(rel);

const SKIP = new Set(["src/app/globals.css"]);

const CLASS_PATTERNS = [
  { re: /text-\[8px\]/g, hint: "bv103-type-label (≥11px)" },
  { re: /text-\[9px\]/g, hint: "bv103-type-label (≥11px)" },
  { re: /text-\[10px\]/g, hint: "bv103-type-label (≥11px)" },
  { re: /["'`][^"'`\n]*\bfont-black\b/g, hint: "KPI = bv103-type-kpi; còn lại semibold" },
  { re: /["'`][^"'`\n]*\bfont-extrabold\b/g, hint: "bv103-type-title / font-semibold" },
];

/** text-2xl/3xl/4xl ngoài KPI / số tabular. */
function countPosterType(text) {
  let n = 0;
  for (const m of text.matchAll(/["'`]([^"'`\n]*\btext-(2xl|3xl|4xl)\b[^"'`\n]*)["'`]/g)) {
    const cls = m[1];
    if (/bv103-type-kpi|tabular-nums|statValue|kpiValue/.test(cls)) continue;
    n++;
  }
  return n;
}

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

function countScreenItalic(text) {
  const stripped = text
    .replace(/fontStyle:\s*["']italic["']/g, "")
    .replace(/font-style:\s*italic/g, "");
  return stripped.match(/[\s"'`]italic[\s"'`]/g)?.length ?? 0;
}

let hits = 0;
for (const base of SCAN_DIRS) {
  const abs = join(ROOT, base);
  for (const file of walk(abs)) {
    const rel = file.replace(`${ROOT}/`, "");
    if (SKIP.has(rel) || rel.endsWith(".spec.ts") || rel.endsWith(".spec.tsx")) continue;
    if (isPrintPath(rel)) continue;
    const text = readFileSync(file, "utf8");
    for (const { re, hint } of CLASS_PATTERNS) {
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[typography-drift] ${rel}: ${hint} (${m.length})`);
      }
    }
    const italics = countScreenItalic(text);
    if (italics > 0) {
      hits += italics;
      console.warn(`[typography-drift] ${rel}: italic ngoài bv103-type-note / in ấn (${italics})`);
    }
    const poster = countPosterType(text);
    if (poster > 0) {
      hits += poster;
      console.warn(`[typography-drift] ${rel}: text-2xl/3xl/4xl ngoài KPI — bv103-type-title / type-kpi (${poster})`);
    }
  }
}

if (hits === 0) {
  console.log("[typography-drift] OK — thang 5 vai trò, không 8/9/10px / black / extrabold / italic màn hình.");
} else {
  console.error(`[typography-drift] FAIL — ${hits} khớp. Dùng bv103-type-* hoặc npm run panel:normalize.`);
  process.exitCode = 1;
}
