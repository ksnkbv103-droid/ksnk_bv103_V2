#!/usr/bin/env node
/**
 * Gate drift layout + typography + adoption (BV103).
 * Chạy: npm run layout:drift-check
 * @see docs/reference/guides/bv103-visual-language.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app", "src/hooks"];
const SKIP_PRIMARY_HEX = new Set(["src/app/globals.css"]);
const SKIP_TYPOGRAPHY = new Set([
  "src/app/globals.css",
  "src/lib/bv103-design-tokens.ts",
  "src/lib/bv103-layout-chrome.ts",
  "src/modules/dashboard/lib/dashboard-print-template.ts",
  "src/modules/dashboard/lib/bao-cao-tong-hop-print.ts",
  "src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx",
  "src/components/shared/PrintLayout.tsx",
  "src/hooks/usePrint.ts",
]);

const isChromeDef = (rel) => /-chrome\.ts$/.test(rel);
const isColumnsFile = (rel) => rel.includes("columns") && rel.endsWith(".tsx");
const isPanelFormFile = (rel) =>
  /Panel|Form|Modal/i.test(rel) && rel.endsWith(".tsx") && !rel.includes("columns");

const PANEL_CHROME_NEEDLE =
  /bv103PanelChrome|bv103LayoutChrome|bv103DesignTokens|quanTriFormChrome|gscFormChrome|nkbvFormChrome|dashboardChrome|cssd-ui-chrome|CSSD_UI_PANEL|qlcvTableChrome|-form-chrome|-table-chrome/;

const PANEL_SKIP = new Set([
  "src/modules/giam-sat-chung/components/GiamSatChungForm.tsx",
  "src/modules/giam-sat-vst/components/VSTForm.tsx",
]);

/** Chỉ tiêu đề khối — nút touch (btnTouch) giữ IN HOA */
const PANEL_TYPO_PATTERNS = [
  {
    re: /<h[2345][^>]*className="[^"]*uppercase[^"]*"/g,
    hint: "Tiêu đề panel IN HOA — panelTitle (title case)",
  },
];

/** Cho phép font-black: KPI, tabular số, choiceBtn/segment touch */
const FONT_BLACK_ALLOW = new RegExp(
  [
    "statValue",
    "statValueLg",
    "statValueXl",
    "tabular-nums",
    "choiceBtn",
    "segmentBtn",
    "btnPrimaryBlock",
    "kpiValue",
    "no-print",
    "print:",
    "h-16 w-full",
    "h-14 w-full",
    "text-lg font-black",
    "tracking-widest text-red",
    "btnTouch",
    "choiceBtn",
    "h-11 rounded-xl",
    "h-16 rounded-2xl",
    "border-2 font-black",
    "rounded-full bg-",
    "scale-\\[1\\.02\\]",
    "ring-2 ring-emerald",
    "shadow-md shadow-\\[var\\(--primary\\)\\]",
  ].join("|"),
);

const LAYOUT_PATTERNS = [
  { re: /rounded-\[32px\]/g, hint: "rounded-[var(--radius-shell)] / bv103LayoutChrome.panelSurface" },
  { re: /rounded-\[3rem\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /rounded-\[40px\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /rounded-\[2\.5rem\]/g, hint: "rounded-[var(--radius-shell)]" },
  { re: /className="[^"]*\binput\b[^"]*rounded-(?!full)/g, hint: "bv103LayoutChrome.controlInput" },
  { re: /text-\[(9|10)px\]/g, hint: "label tối thiểu text-[11px]" },
  { re: /#026f17/g, hint: "dùng var(--primary)" },
];

const TYPO_PATTERNS = [
  {
    re: /text-(2xl|3xl|4xl)[^"'`\n]{0,96}font-black[^"'`\n]{0,96}uppercase/g,
    hint: "H1 poster — pageTitle / authTitle",
  },
  {
    re: /text-(2xl|3xl|4xl)[^"'`\n]{0,96}font-black[^"'`\n]{0,96}text-\[var\(--primary\)\]/g,
    hint: "Tiêu đề primary+black — pageTitle slate",
  },
  {
    re: /<h[12][^>]*className="[^"]*font-black[^"]*uppercase/g,
    hint: "Heading IN HOA — sectionTitle / pageTitle",
  },
  {
    re: /text-\[11px\][^"'`\n]{0,72}font-black[^"'`\n]{0,72}uppercase/g,
    hint: "Label IN HOA — labelBlock",
  },
];

const COLUMNS_TYPO_PATTERNS = [
  {
    re: /text-sm[^"'`\n]{0,64}uppercase/g,
    hint: "Body text-sm không IN HOA — tableCellBody",
  },
  {
    re: /header:\s*"[A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]{4,}/g,
    hint: "Header cột IN HOA — title case",
  },
];

const CHROME_NEEDLE =
  /table-chrome|ui-chrome|dashboard-chrome|quanTriTableChrome|gscTableChrome|qlcvTableChrome|CSSD_UI_CELL|dashboardChrome\.cell/;

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

function walkColumns(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkColumns(p, out);
    else if (name.includes("columns") && name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function countFontBlackDrift(text) {
  let n = 0;
  for (const m of text.matchAll(/font-black/g)) {
    const ctx = text.slice(Math.max(0, m.index - 80), m.index + 80);
    if (!FONT_BLACK_ALLOW.test(ctx)) n++;
  }
  return n;
}

let hits = 0;

for (const base of SCAN_DIRS) {
  for (const file of walk(join(ROOT, base))) {
    const text = readFileSync(file, "utf8");
    const rel = file.replace(ROOT + "/", "");
    if (rel.endsWith(".spec.ts") || rel.endsWith(".spec.tsx")) continue;

    for (const { re, hint } of LAYOUT_PATTERNS) {
      if (re.source === "#026f17" && SKIP_PRIMARY_HEX.has(rel)) continue;
      const m = text.match(re);
      if (m) {
        hits += m.length;
        console.warn(`[layout-drift] ${rel}: ${hint} (${m.length})`);
      }
    }

    if (!SKIP_TYPOGRAPHY.has(rel) && !isChromeDef(rel)) {
      for (const { re, hint } of TYPO_PATTERNS) {
        const m = text.match(re);
        if (m) {
          hits += m.length;
          console.warn(`[typo-drift] ${rel}: ${hint} (${m.length})`);
        }
      }
      if (isColumnsFile(rel)) {
        for (const { re, hint } of COLUMNS_TYPO_PATTERNS) {
          const m = text.match(re);
          if (m) {
            hits += m.length;
            console.warn(`[columns-drift] ${rel}: ${hint} (${m.length})`);
          }
        }
        const fb = countFontBlackDrift(text);
        if (fb > 0) {
          hits += fb;
          console.warn(`[columns-drift] ${rel}: font-black ngoài KPI (${fb})`);
        }
      }
      if (isPanelFormFile(rel) && !PANEL_SKIP.has(rel)) {
        for (const { re, hint } of PANEL_TYPO_PATTERNS) {
          const m = text.match(re);
          if (m) {
            hits += m.length;
            console.warn(`[panel-drift] ${rel}: ${hint} (${m.length})`);
          }
        }
        const fb = countFontBlackDrift(text);
        if (fb > 0) {
          hits += fb;
          console.warn(`[panel-drift] ${rel}: font-black ngoài KPI (${fb})`);
        }
      }
    }
  }
}

function walkPanelForm(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkPanelForm(p, out);
    else if (/Panel|Form|Modal/i.test(name) && name.endsWith(".tsx") && !name.includes("columns")) out.push(p);
  }
  return out;
}

for (const file of walkPanelForm(join(ROOT, "src"))) {
  const rel = file.replace(ROOT + "/", "");
  if (PANEL_SKIP.has(rel) || rel.endsWith(".spec.tsx")) continue;
  const text = readFileSync(file, "utf8");
  if (!PANEL_CHROME_NEEDLE.test(text)) {
    hits++;
    console.warn(`[adoption-drift] ${rel}: thiếu import *-form-chrome / bv103-panel-chrome`);
  }
  const USES_CHROME_TOKEN =
    /\b(UI|C|TC|P|F|D)\.|bv103LayoutChrome\.|gscFormChrome\.|quanTriFormChrome\.|nkbvFormChrome\.|dashboardChrome\.|CSSD_UI_|bv103DesignTokens\./;
  if (PANEL_CHROME_NEEDLE.test(text) && !USES_CHROME_TOKEN.test(text)) {
    console.warn(`[adoption-warn] ${rel}: import chrome — chưa wire token (chạy npm run panel:wire)`);
  }
}

for (const file of walkColumns(join(ROOT, "src"))) {
  const rel = file.replace(ROOT + "/", "");
  const text = readFileSync(file, "utf8");
  if (!CHROME_NEEDLE.test(text)) {
    hits++;
    console.warn(`[adoption-drift] ${rel}: thiếu import *-table-chrome / *-ui-chrome`);
  }
}

if (hits === 0) {
  console.log("[layout-drift] OK — không thấy pattern drift phổ biến.");
} else {
  console.warn(`[layout-drift] Tổng ${hits} khớp — xử lý theo module.`);
  process.exitCode = 1;
}
