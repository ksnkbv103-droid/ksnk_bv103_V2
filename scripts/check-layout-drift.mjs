#!/usr/bin/env node
/**
 * Gợi ý kiểm tra drift layout + typography (BV103 — không chặn CI mặc định).
 * Chạy: npm run layout:drift-check
 * @see docs/modules/giam-sat/layout-primitives.md
 * @see docs/reference/guides/bv103-visual-language.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app", "src/hooks"];
/** File định nghĩa token gốc — không báo hardcode màu primary. */
const SKIP_PRIMARY_HEX = new Set(["src/app/globals.css"]);
/** File in ấn / spec / UI đặc biệt — bỏ qua gate typography. */
const SKIP_TYPOGRAPHY = new Set([
  "src/app/globals.css",
  "src/modules/dashboard/lib/dashboard-print-template.ts",
  "src/modules/dashboard/lib/bao-cao-tong-hop-print.ts",
  "src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx",
]);

const LAYOUT_PATTERNS = [
  { re: /rounded-\[32px\]/g, hint: "rounded-[var(--radius-shell)] / bv103LayoutChrome.panelSurface" },
  { re: /rounded-\[3rem\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /rounded-\[40px\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /rounded-\[2\.5rem\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /className="[^"]*\binput\b[^"]*rounded-(?!full)/g, hint: "bv103LayoutChrome.controlInput — tránh .input + rounded-* lệch" },
  { re: /text-\[(9|10)px\]/g, hint: "label tối thiểu text-[11px] / bv103LayoutChrome.labelField" },
  { re: /#026f17/g, hint: "dùng var(--primary) thay hardcode" },
];

const TYPO_PATTERNS = [
  {
    re: /text-(2xl|3xl|4xl)[^"'`\n]{0,96}font-black[^"'`\n]{0,96}uppercase/g,
    hint: "H1 poster UI — dùng bv103DesignTokens.pageTitle / authTitle",
  },
  {
    re: /text-(2xl|3xl|4xl)[^"'`\n]{0,96}font-black[^"'`\n]{0,96}text-\[var\(--primary\)\]/g,
    hint: "Tiêu đề không dùng primary + font-black — dùng pageTitle slate",
  },
  {
    re: /<h[12][^>]*className="[^"]*font-black[^"]*uppercase/g,
    hint: "Heading IN HOA + font-black — dùng pageTitle / sectionTitle",
  },
  {
    re: /text-\[11px\][^"'`\n]{0,72}font-black[^"'`\n]{0,72}uppercase/g,
    hint: "Label form IN HOA — dùng labelBlock / labelField",
  },
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
    const rel = file.replace(ROOT + "/", "");
    if (rel.endsWith(".spec.ts") || rel.endsWith(".spec.tsx")) continue;

    for (const { re, hint } of LAYOUT_PATTERNS) {
      if (re.source === "#026f17" && SKIP_PRIMARY_HEX.has(rel)) continue;
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[layout-drift] ${rel}: ${re} → ${hint} (${m.length})`);
      }
    }

    if (SKIP_TYPOGRAPHY.has(rel)) continue;
    for (const { re, hint } of TYPO_PATTERNS) {
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[typo-drift] ${rel}: ${re} → ${hint} (${m.length})`);
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
