#!/usr/bin/env node
/**
 * Chuẩn hóa header bảng (IN HOA → title case) + ô cell typography — 4 domain C.
 * Chạy: node scripts/normalize-table-ui.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_MODULES = [
  "src/modules/quan-tri-he-thong",
  "src/modules/cssd-erp",
  "src/modules/giam-sat-chung",
  "src/modules/giam-sat-vst",
  "src/modules/giam-sat-nkbv",
  "src/modules/dashboard",
  "src/modules/quan-ly-cong-viec",
];
const SKIP = new Set([
  "src/modules/dashboard/lib/dashboard-print-template.ts",
  "src/modules/dashboard/lib/bao-cao-tong-hop-print.ts",
  "src/modules/quan-tri-he-thong/lib/excel-io.helpers.ts",
  "src/modules/cssd-erp/components/scan/QRScanSuccessCard.tsx",
]);

const CELL_CODE = "font-mono text-[11px] font-medium text-[var(--primary)]";
const CELL_BODY = "text-sm font-medium leading-relaxed text-slate-700";
const CELL_TITLE = "text-sm font-semibold leading-snug text-slate-800";
const CELL_META = "text-[11px] font-medium text-slate-500";
const CELL_INDEX = "text-[11px] font-medium text-slate-400";

const REPLACEMENTS = [
  ["text-xs font-black text-slate-700 leading-relaxed uppercase tracking-tight whitespace-normal", `${CELL_BODY} whitespace-normal`],
  ["text-xs font-black text-slate-700 leading-relaxed uppercase", CELL_BODY],
  ["font-black uppercase text-[11px] text-[var(--primary)]", CELL_CODE],
  ["font-black text-[var(--primary)]", CELL_CODE],
  ["font-black text-red-600", "font-mono text-[11px] font-medium text-red-600"],
  ["text-[11px] font-bold uppercase text-slate-600", CELL_META],
  ["text-[11px] font-bold uppercase text-amber-700", "text-[11px] font-medium text-amber-700"],
  ["text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]", CELL_CODE],
  ["text-[11px] font-semibold uppercase tracking-tight text-[var(--primary)]", CELL_CODE],
  ["font-mono text-[11px] font-bold uppercase text-slate-700", CELL_CODE.replace("text-[var(--primary)]", "text-slate-700")],
  ["font-mono text-[11px] font-bold uppercase text-slate-500", "font-mono text-[11px] font-medium text-slate-500"],
  ["font-bold text-slate-500", CELL_META],
  ["font-black text-slate-400", CELL_INDEX],
  ["text-[11px] font-bold text-slate-400 uppercase italic", "text-[11px] font-normal text-slate-400 italic"],
  ["text-[11px] font-bold uppercase text-slate-300", CELL_INDEX],
  ["text-[11px] font-semibold uppercase tracking-wide text-slate-600", CELL_META],
  ["rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold", "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium"],
];

function isMostlyUppercase(s) {
  const letters = [...s].filter((c) => /[A-Za-zÀ-ỹ]/.test(c));
  if (letters.length < 2) return false;
  const up = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return up / letters.length > 0.65;
}

/** Header cột BV103: chữ thường, chỉ chữ cái đầu (và sau `/`) viết hoa. */
function headerCaseVi(s) {
  return s
    .split("/")
    .map((part) => {
      const t = part.trim().toLocaleLowerCase("vi-VN");
      if (!t) return "";
      return t.charAt(0).toLocaleUpperCase("vi-VN") + t.slice(1);
    })
    .join(" / ");
}

function normalizeHeaders(text) {
  return text.replace(/header:\s*"([^"]+)"/g, (full, label) => {
    const next = headerCaseVi(label);
    if (next === label) return full;
    return `header: "${next}"`;
  });
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
    else if ([".tsx", ".ts"].includes(extname(name)) && !name.endsWith(".spec.ts")) out.push(p);
  }
  return out;
}

let files = 0;
let reps = 0;

for (const base of SCAN_MODULES) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.replace(ROOT + "/", "");
    if (SKIP.has(rel)) continue;

    let text = readFileSync(file, "utf8");
    const before = text;

    text = normalizeHeaders(text);
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

console.log(`[normalize-table-ui] ${files} files, ${reps} replacements.`);
