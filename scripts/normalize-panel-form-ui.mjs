#!/usr/bin/env node
/**
 * Chuẩn hóa panel / form / modal — font-black, IN HOA label, KPI.
 * Chạy: npm run panel:normalize
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["src/modules", "src/components", "src/app"];
const SKIP = new Set([
  "src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx",
  "src/modules/dashboard/lib/dashboard-print-template.ts",
  "src/modules/dashboard/lib/bao-cao-tong-hop-print.ts",
  "src/components/shared/PrintLayout.tsx",
  "src/hooks/usePrint.ts",
  "src/lib/bv103-layout-chrome.ts",
  "src/lib/bv103-design-tokens.ts",
  "src/lib/bv103-panel-chrome.ts",
]);

const isPanelFormFile = (name) =>
  /Panel|Form|Modal|modal/i.test(name) && (name.endsWith(".tsx") || name.endsWith(".ts"));

const REPLACEMENTS = [
  ["text-3xl font-black", "text-3xl font-semibold tabular-nums"],
  ["text-2xl font-black", "text-2xl font-semibold tabular-nums"],
  ["text-xl font-black", "text-xl font-semibold"],
  ["text-xs font-black", "text-xs font-semibold"],
  ["text-sm font-black", "text-sm font-semibold"],
  ["text-[11px] font-black", "text-[11px] font-semibold"],
  ["font-extrabold uppercase", "font-semibold"],
  ["font-bold uppercase tracking-wider", "font-medium"],
  ["font-bold uppercase tracking-wide", "font-medium"],
  ["text-[11px] font-bold uppercase", "text-[11px] font-medium"],
  ["text-xs font-black uppercase", "text-xs font-semibold"],
  ["text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]/60", "text-[11px] font-medium text-[var(--primary)]/70"],
  ["text-[11px] font-semibold uppercase text-blue-400", "text-[11px] font-medium text-blue-500"],
  ["text-[11px] font-semibold uppercase text-purple-400", "text-[11px] font-medium text-purple-500"],
  ["text-[11px] font-semibold uppercase text-teal-400", "text-[11px] font-medium text-teal-500"],
  ["text-[11px] font-semibold uppercase tracking-wide text-blue-500", "text-[11px] font-medium text-blue-600"],
  ["text-[11px] font-semibold uppercase tracking-wide text-purple-500", "text-[11px] font-medium text-purple-600"],
  ["text-[11px] font-semibold uppercase tracking-wide text-teal-500", "text-[11px] font-medium text-teal-600"],
  ["bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500", "bg-slate-50/90 text-[11px] font-medium text-slate-500"],
  ["text-[11px] text-slate-600 font-bold uppercase tracking-wider", "text-[11px] font-medium text-slate-600"],
  ["text-center text-xs font-black text-slate-700", "text-center text-xs font-semibold tabular-nums text-slate-700"],
  ['<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">', '<span className="text-[11px] font-medium text-slate-400 mt-0.5">'],
  ["rounded-lg text-[11px] font-extrabold uppercase", "rounded-lg text-[11px] font-semibold"],
  ["rounded-lg text-[11px] font-extrabold uppercase", "rounded-lg text-[11px] font-semibold"],
  ["text-slate-400 font-bold uppercase tracking-wider text-[11px]", "text-[11px] font-medium text-slate-500"],
  ["text-[11px] font-medium text-slate-400 uppercase tracking-wider", "text-[11px] font-medium text-slate-400"],
  ["text-[11px] text-[11px] font-medium text-slate-500 block uppercase", "text-[11px] font-medium text-slate-500 block"],
  ["ĐÃ HẾT HẠN", "Đã hết hạn"],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (!statSync(p).isDirectory()) {
      if ([".tsx", ".ts"].includes(extname(name)) && !name.endsWith(".spec.ts")) out.push(p);
      continue;
    }
    walk(p, out);
  }
  return out;
}

let files = 0;
let reps = 0;

for (const base of SCAN) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.replace(ROOT + "/", "");
    if (SKIP.has(rel)) continue;
    if (!isPanelFormFile(file.split("/").pop() ?? "")) continue;

    let text = readFileSync(file, "utf8");
    const before = text;
    for (const [from, to] of REPLACEMENTS) {
      const parts = text.split(from);
      if (parts.length > 1) {
        reps += parts.length - 1;
        text = parts.join(to);
      }
    }
    if (text !== before) {
      writeFileSync(file, text);
      files++;
    }
  }
}

console.log(`[normalize-panel-form-ui] ${files} files, ${reps} replacements.`);
