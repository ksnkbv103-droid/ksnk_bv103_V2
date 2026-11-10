#!/usr/bin/env node
/**
 * UI audit (tĩnh) — đếm mẫu class gây lệch giao diện; ratchet: số không được tăng.
 * Chạy:
 *   node scripts/ui-audit.mjs            # in số hiện tại so với baseline
 *   node scripts/ui-audit.mjs --check    # exit 1 nếu có chỉ số TĂNG so với baseline
 *   node scripts/ui-audit.mjs --write    # ghi baseline mới (chỉ khi giảm hoặc lần đầu)
 * Kế hoạch: docs/ux/ui-redesign-plan.md (Lát 0, Lát 6).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(ROOT, "scripts/data/ui-audit-baseline.json");
const SCAN_DIRS = ["src/modules", "src/components", "src/app", "src/hooks"];
/** Định nghĩa token/in ấn: không tính (được phép chứa giá trị gốc). */
const SKIP = new Set([
  "src/lib/bv103-design-tokens.ts",
  "src/lib/bv103-layout-chrome.ts",
  "src/app/globals.css",
]);
/** Bộ component chuẩn (Lát 2) là nơi định nghĩa, không tính như chỗ dùng. */
const KIT_DIR = "src/components/ui/bv103/";
const isPrint = (rel) => /print|PrintView|PrintLayout|usePrint/i.test(rel);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if ([".ts", ".tsx"].includes(extname(name)) && !name.endsWith(".spec.ts")) out.push(p);
  }
  return out;
}

const count = (text, re) => (text.match(re) || []).length;

const METRICS = {
  // Bo góc: mỗi cỡ thêm một "thước". Mục tiêu cuối: 1 thước control + pill.
  radiusArbitrary: /rounded-\[[^\]]+\]/g,
  radiusMd: /\brounded-md\b/g,
  radiusLg: /\brounded-lg\b/g,
  radiusXl: /\brounded-xl\b/g,
  radius2xl: /\brounded-(2xl|3xl)\b/g,
  // Chiều cao tự đặt (bỏ qua token --bv103-control-h).
  heightArbitrary: /\b(?:min-)?h-\[(?!var\()[^\]]+\]/g,
  // Chữ nhỏ / độ đậm cao.
  text11px: /text-\[11px\]/g,
  textSubRem: /text-\[0?\.[0-7][0-9]*rem\]/g,
  fontHeavy: /\bfont-(bold|extrabold|black)\b/g,
  // Bóng nặng (card nổi tùy hứng).
  shadowHeavy: /\bshadow-(lg|xl|2xl)\b/g,
};

function measure() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const totals = Object.fromEntries(Object.keys(METRICS).map((k) => [k, 0]));
  let rawButtonFiles = 0;
  let uiButtonFiles = 0;
  let pageFiles = 0;
  let pagesWithShell = 0;
  for (const f of files) {
    const rel = relative(ROOT, f).split("\\").join("/");
    if (SKIP.has(rel) || rel.startsWith(KIT_DIR) || isPrint(rel)) continue;
    const text = readFileSync(f, "utf8");
    for (const [k, re] of Object.entries(METRICS)) totals[k] += count(text, re);
    if (/<button\b/.test(text)) rawButtonFiles++;
    if (/components\/ui\/button/.test(text)) uiButtonFiles++;
    if (rel.startsWith("src/app/") && rel.endsWith("/page.tsx")) {
      pageFiles++;
      if (/KsnkPageShell|KsnkPageChrome|Bv103AnalyticsPageFrame|CSSDPageShell/.test(text)) pagesWithShell++;
    }
  }
  return { ...totals, rawButtonFiles, uiButtonFiles, pageFiles, pagesWithShell };
}

/** Chỉ số "càng thấp càng tốt" (ratchet chặn tăng). */
const LOWER_IS_BETTER = new Set([
  ...Object.keys(METRICS),
  "rawButtonFiles",
]);
/** Chỉ số "càng cao càng tốt" (ratchet chặn giảm). */
const HIGHER_IS_BETTER = new Set(["uiButtonFiles", "pagesWithShell"]);

const args = new Set(process.argv.slice(2));
const now = measure();
const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")).metrics : null;

if (args.has("--write")) {
  writeFileSync(
    BASELINE,
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), metrics: now }, null, 2) + "\n",
  );
  console.log("[ui-audit] đã ghi baseline:", BASELINE.replace(ROOT + "/", ""));
}

const regress = [];
for (const [k, v] of Object.entries(now)) {
  const b = base?.[k];
  const delta = b == null ? "" : v === b ? " (=)" : ` (${v > b ? "+" : ""}${v - b})`;
  console.log(`${k.padEnd(18)} ${String(v).padStart(5)}${delta}`);
  if (b == null) continue;
  if (LOWER_IS_BETTER.has(k) && v > b) regress.push(`${k}: ${b} → ${v}`);
  if (HIGHER_IS_BETTER.has(k) && v < b) regress.push(`${k}: ${b} → ${v}`);
}

if (args.has("--check")) {
  if (!base) {
    console.error("[ui-audit] chưa có baseline — chạy --write trước.");
    process.exit(1);
  }
  if (regress.length) {
    console.error("[ui-audit] TỤT LÙI so với baseline:\n  " + regress.join("\n  "));
    process.exit(1);
  }
  console.log("[ui-audit] OK — không chỉ số nào tụt lùi.");
}
