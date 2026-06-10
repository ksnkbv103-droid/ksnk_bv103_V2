#!/usr/bin/env node
/**
 * Bulk migrate typography drift → BV103 tokens (literal class strings).
 * Chạy: node scripts/fix-typo-drift.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["src/modules", "src/components", "src/app"];
const SKIP = new Set([
  "src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx",
  "src/modules/dashboard/lib/dashboard-print-template.ts",
  "src/modules/dashboard/lib/bao-cao-tong-hop-print.ts",
]);

const LABEL = "text-[11px] font-medium text-slate-500";
const LABEL_MUTED = "text-[11px] font-medium text-slate-400";
const SECTION = "text-sm font-semibold text-slate-800";
const SECTION_SM = "text-[11px] font-semibold text-slate-800";
const PAGE_TITLE = "text-xl font-semibold tracking-tight text-slate-900 md:text-2xl";
const AUTH_TITLE = "text-2xl font-semibold tracking-tight text-slate-900";
const BTN_TOUCH = "text-[11px] font-semibold uppercase tracking-wide";
const TABLE_ROW = "text-[11px] font-medium text-slate-500";

/** Ordered replacements — specific before general. */
const REPLACEMENTS = [
  // Table headers
  ["text-[11px] font-black uppercase tracking-wider text-slate-400", TABLE_ROW],
  ["text-[11px] font-black uppercase tracking-widest text-slate-400", TABLE_ROW],
  ["text-[11px] font-black uppercase tracking-[0.25em] text-slate-400", TABLE_ROW],
  ["text-[11px] font-black uppercase tracking-[0.2em] text-slate-400", TABLE_ROW],
  ["text-[11px] font-black uppercase tracking-wide text-slate-400", TABLE_ROW],
  ["text-[11px] font-black uppercase text-slate-400", LABEL_MUTED],
  ["text-[11px] font-black text-slate-400 uppercase", LABEL_MUTED],
  ["text-[11px] font-black text-slate-400 block uppercase", `block ${LABEL_MUTED}`],
  ["text-[11px] font-black text-slate-500 uppercase", LABEL],
  ["text-[11px] font-black uppercase text-slate-500", LABEL],
  ["text-[11px] font-black uppercase text-slate-600", LABEL],
  ["text-[11px] font-black uppercase text-slate-700", SECTION_SM],
  ["text-[11px] font-black uppercase tracking-wider text-slate-700", SECTION_SM],
  ["text-[11px] font-black uppercase tracking-widest text-slate-700", SECTION_SM],
  ["text-sm font-black uppercase tracking-wider text-slate-700", SECTION],
  ["text-sm font-black uppercase tracking-wider text-slate-800", SECTION],
  ["text-sm font-black uppercase text-slate-800", SECTION],
  ["text-xs font-black uppercase tracking-wider text-slate-500", LABEL],
  ["text-xs font-bold uppercase tracking-wider text-slate-500", LABEL],
  ["text-xs font-bold uppercase text-slate-400", LABEL_MUTED],
  ["text-xs font-bold uppercase text-slate-500", LABEL],
  ["text-xs font-bold uppercase text-slate-600", LABEL],
  // Form labels quan-tri
  ["text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1", `block ml-1 ${LABEL}`],
  ["text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.2em] ml-4", `block ml-4 ${LABEL}`],
  ["text-[11px] font-black uppercase text-slate-500", LABEL],
  ["text-[11px] font-black uppercase text-slate-400", LABEL_MUTED],
  ["text-[11px] font-black uppercase tracking-widest text-slate-500", LABEL],
  ["text-[11px] font-black uppercase tracking-wider text-slate-500", LABEL],
  ["ml-4 text-[11px] font-black uppercase text-slate-500", `ml-4 block ${LABEL}`],
  // Headings
  ["text-lg font-black text-slate-800 uppercase tracking-tight", SECTION],
  ["text-lg font-black uppercase tracking-tight", SECTION],
  ["text-2xl font-black uppercase text-[var(--primary)]", AUTH_TITLE],
  ["text-xl font-black uppercase tracking-tight text-[var(--primary)]", PAGE_TITLE],
  ["text-3xl font-black text-[var(--primary)] uppercase tracking-tighter", PAGE_TITLE],
  ["text-3xl font-black uppercase tracking-tighter text-[var(--primary)]", PAGE_TITLE],
  // Touch CTAs — giữ IN HOA, bỏ font-black
  ["text-xs font-black uppercase tracking-widest", "text-xs font-semibold uppercase tracking-wide"],
  ["text-xs font-black uppercase tracking-wider", BTN_TOUCH],
  ["text-[11px] font-black uppercase tracking-widest", BTN_TOUCH],
  ["text-[11px] font-black uppercase tracking-wider", BTN_TOUCH],
  ["text-[11px] font-black uppercase tracking-wide", BTN_TOUCH],
  ["text-[11px] font-black uppercase", BTN_TOUCH],
  // h1/h2 in JSX
  ['className="text-2xl font-black uppercase text-[var(--primary)]"', `className="${AUTH_TITLE}"`],
  ['className="text-lg font-black uppercase tracking-tight text-[var(--primary)]"', `className="${SECTION}"`],
  // Order variants
  ["text-[11px] font-black text-[var(--primary)] uppercase tracking-widest", "text-[11px] font-medium text-[var(--primary)]"],
  ["text-[11px] font-black text-[var(--primary)] uppercase tracking-wider", "text-[11px] font-medium text-[var(--primary)]"],
  ["text-[11px] font-black text-slate-300 uppercase tracking-widest", LABEL_MUTED],
  ["font-black text-[var(--primary)] uppercase text-[11px]", "text-[11px] font-medium text-[var(--primary)]"],
  ["text-2xl font-black text-[var(--primary)]", "text-2xl font-semibold tabular-nums text-[var(--primary)]"],
  ["text-3xl font-black text-[var(--primary)]", "text-3xl font-semibold tabular-nums text-[var(--primary)]"],
  ["text-sm font-black uppercase tracking-tight text-[var(--primary)]", "text-sm font-semibold text-[var(--primary)]"],
  ["text-sm font-black uppercase tracking-tight text-slate-800", SECTION],
  ["text-sm font-black uppercase tracking-tight", SECTION],
  ["text-sm font-black text-slate-800 uppercase tracking-tight", SECTION],
  ["text-xl font-black text-slate-900 uppercase tracking-tight", PAGE_TITLE],
  ["text-[11px] font-black text-blue-600 hover:underline uppercase tracking-wide", "text-[11px] font-semibold text-blue-600 hover:underline uppercase tracking-wide"],
  ["text-[11px] font-black text-rose-600 hover:underline uppercase tracking-wide", "text-[11px] font-semibold text-rose-600 hover:underline uppercase tracking-wide"],
  ["bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-black px-2 py-1 rounded-lg uppercase tracking-wider", "bg-[var(--surface-warning-bg)] text-[var(--surface-warning-text)] border border-[var(--surface-warning-border)] text-[11px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wide"],
  ["bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-black px-2 py-1 rounded-lg uppercase tracking-wider", "bg-[var(--surface-success-bg)] text-[var(--surface-success-text)] border border-[var(--surface-success-border)] text-[11px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wide"],
  ["bg-amber-50 text-amber-600 border border-amber-100 text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider", "bg-[var(--surface-warning-bg)] text-[var(--surface-warning-text)] border border-[var(--surface-warning-border)] text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide"],
  ["bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider", "bg-[var(--surface-success-bg)] text-[var(--surface-success-text)] border border-[var(--surface-success-border)] text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide"],
  ["bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider", "text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide text-blue-700 border border-blue-100 bg-blue-50"],
  ["bg-slate-50 text-slate-500 border border-slate-100 text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider", "text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide text-slate-600 border border-slate-100 bg-slate-50"],
  ["text-[11px] font-black bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg uppercase tracking-wider", "text-[11px] font-medium bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg"],
  ["text-[11px] font-black text-[var(--primary)] uppercase tracking-widest", "text-[11px] font-medium text-[var(--primary)]"],
  ["text-[11px] font-black text-slate-600 uppercase tracking-tighter", "text-[11px] font-medium text-slate-600"],
  ["font-black text-slate-700 uppercase text-[11px] tracking-tight", "text-[11px] font-semibold text-slate-800"],
  ["text-sm font-black text-slate-800 uppercase tracking-tight mt-1", "text-sm font-semibold text-slate-800 mt-1"],
  ["text-[11px] font-black text-[var(--primary)] uppercase tracking-widest", "text-[11px] font-mono font-medium text-[var(--primary)]"],
  // Badge pills — font-semibold keeps uppercase, drops font-black
  ["text-[11px] font-black px-2 py-0.5 rounded-full uppercase", "text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase"],
  ["text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider", "text-[11px] font-semibold px-3 py-1.5 rounded-lg uppercase tracking-wide"],
  ["text-[11px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider", "text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase tracking-wide"],
  ["font-black text-[11px] uppercase px-2.5 py-1 rounded-lg", "font-semibold text-[11px] uppercase px-2.5 py-1 rounded-lg"],
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
    else if (extname(name) === ".tsx") out.push(p);
  }
  return out;
}

let filesChanged = 0;
let totalReplacements = 0;

for (const base of SCAN_DIRS) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.replace(ROOT + "/", "");
    if (SKIP.has(rel) || rel.endsWith(".spec.tsx")) continue;

    let text = readFileSync(file, "utf8");
    const before = text;

    for (const [from, to] of REPLACEMENTS) {
      if (text.includes(from)) {
        const parts = text.split(from);
        const count = parts.length - 1;
        if (count > 0) {
          text = parts.join(to);
          totalReplacements += count;
        }
      }
    }

    if (text !== before) {
      writeFileSync(file, text, "utf8");
      filesChanged += 1;
    }
  }
}

console.log(`[fix-typo-drift] ${filesChanged} files, ${totalReplacements} replacements.`);
