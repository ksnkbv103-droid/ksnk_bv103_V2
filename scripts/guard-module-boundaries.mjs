#!/usr/bin/env node
/**
 * Cổng ranh giới module (PO 2026-11-10). Vi phạm có sẵn nằm ở baseline; chỉ fail khi có vi phạm MỚI
 * hoặc baseline còn dòng đã hết vi phạm (baseline chỉ được giảm).
 *
 *   node scripts/guard-module-boundaries.mjs           kiểm
 *   node scripts/guard-module-boundaries.mjs --prune   bỏ dòng baseline đã hết vi phạm
 *   node scripts/guard-module-boundaries.mjs --init    ghi lại toàn bộ baseline (cần PO đồng ý)
 *
 * Tầng CSSD: lõi (cssd-erp/types, shared, workflow/domain) ← cssd-su-co ← phần còn lại của cssd-erp.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const baselinePath = join(root, "scripts", "module-boundaries.baseline.json");

const CSSD_CORE = /^@\/modules\/cssd-erp\/(types|shared|workflow\/domain)\//;

/** Luật import: file khớp `from` không được import đường dẫn mà `forbid` trả true. */
const IMPORT_RULES = [
  {
    id: "lib-khong-import-modules",
    from: /^src\/lib\//,
    forbid: (spec) => spec.startsWith("@/modules/"),
  },
  {
    id: "cssd-loi-khong-import-su-co",
    from: /^src\/modules\/cssd-erp\/(types|shared|workflow\/domain)\//,
    forbid: (spec) => spec.startsWith("@/modules/cssd-su-co/"),
  },
  {
    id: "cssd-su-co-chi-import-loi",
    from: /^src\/modules\/cssd-su-co\//,
    forbid: (spec) => spec.startsWith("@/modules/cssd-erp/") && !CSSD_CORE.test(spec),
  },
];

/** Luật nội dung: file khớp `from` không được chứa `pattern`. */
const CONTENT_RULES = [
  {
    id: "ui-khong-goi-db-truc-tiep",
    from: /^src\/modules\/[^/]+\/(components|views|hooks)\//,
    pattern: /\.from\(\s*["'`]/,
    label: ".from(\"…\")",
  },
];

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](@\/modules\/[^"']+)["']/g;

function walk(dir, out = []) {
  for (const item of readdirSync(dir)) {
    const p = join(dir, item);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.spec\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const found = {};
for (const rule of [...IMPORT_RULES, ...CONTENT_RULES]) found[rule.id] = new Set();

for (const file of walk(join(root, "src"))) {
  const rel = file.slice(root.length + 1).split("\\").join("/");
  const importRules = IMPORT_RULES.filter((r) => r.from.test(rel));
  const contentRules = CONTENT_RULES.filter((r) => r.from.test(rel));
  if (!importRules.length && !contentRules.length) continue;
  const content = readFileSync(file, "utf8");
  if (importRules.length) {
    for (const m of content.matchAll(IMPORT_RE)) {
      for (const rule of importRules) {
        if (rule.forbid(m[1])) found[rule.id].add(`${rel} -> ${m[1]}`);
      }
    }
  }
  for (const rule of contentRules) {
    if (rule.pattern.test(content)) found[rule.id].add(`${rel} -> ${rule.label}`);
  }
}

const current = Object.fromEntries(Object.entries(found).map(([id, set]) => [id, [...set].sort()]));
const mode = process.argv.includes("--init") ? "init" : process.argv.includes("--prune") ? "prune" : "check";

if (mode === "init") {
  writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  for (const [id, list] of Object.entries(current)) console.log(`${id}: ${list.length}`);
  console.log("guard:boundaries — đã ghi baseline");
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {};
const fresh = [];
const stale = [];
for (const [id, list] of Object.entries(current)) {
  const base = new Set(baseline[id] ?? []);
  const now = new Set(list);
  for (const v of list) if (!base.has(v)) fresh.push(`[${id}] ${v}`);
  for (const v of base) if (!now.has(v)) stale.push(`[${id}] ${v}`);
}

if (mode === "prune") {
  const pruned = Object.fromEntries(
    Object.entries(current).map(([id, list]) => {
      const base = new Set(baseline[id] ?? []);
      return [id, list.filter((v) => base.has(v))];
    }),
  );
  writeFileSync(baselinePath, `${JSON.stringify(pruned, null, 2)}\n`);
  console.log(`guard:boundaries — đã bỏ ${stale.length} dòng baseline hết vi phạm`);
}

console.log("Ranh giới module (vi phạm còn trong baseline):");
for (const [id, list] of Object.entries(current)) {
  const base = new Set(baseline[id] ?? []);
  console.log(`  ${id}: ${list.filter((v) => base.has(v)).length}`);
}

if (fresh.length) {
  console.error(`guard:boundaries FAILED — ${fresh.length} vi phạm mới:`);
  for (const v of fresh) console.error(`  - ${v}`);
  process.exit(1);
}
if (stale.length && mode === "check") {
  console.error(`guard:boundaries FAILED — ${stale.length} dòng baseline đã hết vi phạm, chạy: npm run guard:boundaries -- --prune`);
  for (const v of stale) console.error(`  - ${v}`);
  process.exit(1);
}
console.log("guard:boundaries OK");
