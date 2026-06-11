#!/usr/bin/env node
/**
 * Gắn token chrome (UI.*) vào panel/form/modal đã import chrome.
 * Chạy: node scripts/wire-panel-chrome-usage.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORT_CHROME =
  /import\s*\{[^}]+\s+as\s+(UI|C|F|D|TC|P)\s*\}|import\s*\{\s*gscFormChrome\s*\}|import\s*\{\s*bv103LayoutChrome\s*\}/;
const chromeAlias = (text) => {
  const m = text.match(/\sas\s+(UI|C|F|D|TC|P)\s*\}/);
  if (m) return m[1];
  if (/gscFormChrome/.test(text)) return "gscFormChrome";
  return "bv103LayoutChrome";
};
const hasUsage = (text) =>
  /\b(UI|C|F|D|TC|P)\.|bv103LayoutChrome\.|gscFormChrome\./.test(text);

const WIRE = [
  [/className="space-y-4"/g, 'className={UI.sectionGap}'],
  [/className="space-y-8"/g, 'className={UI.sectionGapLg ?? UI.sectionGap}'],
  [/className="text-sm font-semibold text-slate-800"/g, "className={UI.panelTitle}"],
  [/className="text-sm font-semibold leading-snug text-slate-800"/g, "className={UI.panelTitle}"],
  [/className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl"/g, "className={UI.modalTitle}"],
  [/className="text-[11px] font-medium text-slate-500"/g, "className={UI.kpiLabel}"],
  [/className="text-[11px] font-medium text-slate-400"/g, "className={UI.kpiCaption ?? UI.kpiLabel}"],
  [/className="text-3xl font-semibold tabular-nums text-slate-900"/g, "className={UI.kpiValue}"],
  [/className="text-3xl font-semibold tabular-nums text-\[var\(--primary\)\]"/g, "className={UI.kpiValuePrimary ?? UI.kpiValue}"],
  [/className="text-2xl font-semibold tabular-nums text-slate-900"/g, "className={UI.kpiValueSm ?? UI.kpiValue}"],
  [/className="text-\[11px\] font-medium text-slate-500"/g, "className={UI.innerTableHead}"],
  [/className="text-sm font-medium leading-relaxed text-slate-700"/g, "className={UI.innerTableCell}"],
  [/className="font-mono text-\[11px\] font-medium text-\[var\(--primary\)\]"/g, "className={UI.innerTableCode}"],
  [/className="overflow-hidden rounded-\[var\(--radius-shell\)\] border border-slate-100 bg-white shadow-xl animate-in fade-in duration-500"/g,
    'className={`${UI.shell} shadow-xl animate-in fade-in duration-500 overflow-hidden`}'],
  [/className="rounded-\[var\(--radius-shell\)\] border border-dashed border-slate-200 bg-slate-50 p-12 text-center"/g,
    'className={`${UI.inset} border-dashed p-12 text-center`}'],
  [/className="text-\[11px\] font-semibold uppercase tracking-wide text-amber-800"/g,
    'className={`${UI.panelTitle} text-amber-800`}'],
  [/className="text-\[11px\] font-semibold uppercase tracking-wide text-red-800"/g,
    'className={`${UI.panelTitle} text-red-800`}'],
  [/className="text-xs font-semibold uppercase tracking-wider text-slate-800"/g,
    'className={UI.panelTitle}'],
  [/className="text-sm font-semibold uppercase tracking-wider text-slate-800"/g,
    'className={UI.panelTitle}'],
  [/className="text-xs font-semibold uppercase tracking-wide text-slate-800"/g,
    'className={UI.panelTitle}'],
  [/className="text-sm font-semibold uppercase tracking-widest text-slate-800"/g,
    'className={UI.panelTitle}'],
  [/className="font-black text-slate-700"/g, 'className="font-semibold text-slate-700"'],
  [/className="text-\[11px\] font-bold text-slate-400 uppercase tracking-wider mt-1"/g,
    'className={`${UI.panelSubtitle} mt-1`}'],
  [/className="text-\[11px\] font-medium uppercase leading-relaxed text-slate-500"/g,
    'className={UI.panelSubtitle}'],
  [/className="block text-\[11px\] font-medium text-slate-500 mb-1"/g, 'className={`block mb-1 ${UI.formLabel}`}'],
  [/className="block text-sm font-medium text-slate-700 mb-2"/g, 'className={`block mb-2 ${UI.formLabel}`}'],
  [/className="text-\[11px\] font-medium text-slate-400 tracking-wider"/g, 'className={UI.innerTableHead}'],
];

/** Gắn sectionGap vào root nếu file import UI nhưng chưa dùng token */
function ensureMinimalUsage(text, alias) {
  if (hasUsage(text)) return text;
  return text.replace(
    /return \(\s*\n(\s*)<div className="([^"]+)"/,
    (_m, indent, cls) => `return (\n${indent}<div className={\`\${${alias}.sectionGap} ${cls}\`}`,
  );
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/Panel|Form|Modal/i.test(name) && name.endsWith(".tsx") && !name.includes("columns")) out.push(p);
  }
  return out;
}

let files = 0;
let reps = 0;

for (const file of walk(join(ROOT, "src"))) {
  let text = readFileSync(file, "utf8");
  if (!IMPORT_CHROME.test(text)) continue;
  const alias = chromeAlias(text);
  const WIRE_ALIASED = WIRE.map(([re, to]) => [
    re,
    to
      .replace(/\bUI\./g, `${alias}.`)
      .replace(/\$\{UI\./g, `\${${alias}.`)
      .replace(/\$\{UI\./g, `\${${alias}.`),
  ]);
  const before = text;
  for (const [re, to] of WIRE_ALIASED) {
    const m = text.match(re);
    if (m) {
      reps += m.length;
      text = text.replace(re, to);
    }
  }
  text = ensureMinimalUsage(text, alias);
  if (text !== before) {
    writeFileSync(file, text);
    files++;
    console.log(`[wire] ${file.replace(ROOT + "/", "")}`);
  }
}

console.log(`[wire-panel-chrome] ${files} files, ${reps} token wires.`);
