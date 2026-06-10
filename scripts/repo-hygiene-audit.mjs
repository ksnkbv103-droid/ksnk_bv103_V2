#!/usr/bin/env node
/**
 * Báo cáo hygiene repo — không sửa file.
 * SSOT SQL active: scripts/sql/README.md
 * SSOT docs: docs/DOCS_MANIFEST.yaml
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SQL_ACTIVE = new Set([
  "trial-four-modules-precheck.sql",
  "auth-pilot-precheck.sql",
  "pilot-dashboard-rpc-explain-hybrid.sql",
  "pilot-app-views-precheck.sql",
  "cssd-tram-fk-health-audit.sql",
  "fk-public-referencing-danh-muc-tuy-bien.sql",
  "admin-perf-baseline.sql",
  "admin-rbac-probe.sql",
  "admin-slice-pre-apply-probe.sql",
  "rbac-v-auth-compat-probe.sql",
  "audit-orphan-trigger-probe.sql",
  "gsc-vst-rpc-smoke.sql",
  "khu-vuc-verify.sql",
  "qlcv-pilot-precheck.sql",
  "health-check-gstt-introspect.sql",
  "health-check-gstt-summary-kinds.sql",
  "health-check-gstt-triggers.sql",
  "lookup-catalog-audit.sql",
  "lookup-full-audit.sql",
  "lookup-wave2-ids.sql",
  "mdm-governance-audit-probe.sql",
  "mdm-governance-fk-export.sql",
]);

const LEGACY_TABLE_RE =
  /\.from\((['"])(fact_[a-z0-9_]+|v_fact_[a-z0-9_]+|v_cssd_dm_bo_dung_cu_summary)\1\)/gi;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".next", ".git", "archive_legacy"].includes(ent.name)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function readPkgScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return Object.values(pkg.scripts || {}).join("\n");
}

function section(title) {
  console.log(`\n## ${title}`);
}

let exitCode = 0;

section("Root binaries (nên không commit)");
for (const name of ["awesome-cursorrules.zip", "docs/archive_legacy.zip"]) {
  const p = path.join(ROOT, name);
  console.log(p.replace(ROOT + path.sep, "") + ": " + (fs.existsSync(p) ? "STILL PRESENT" : "ok (absent)"));
  if (fs.existsSync(p)) exitCode = 1;
}

section("SQL active (scripts/sql/)");
const sqlDir = path.join(ROOT, "scripts/sql");
const sqlFiles = fs.existsSync(sqlDir)
  ? fs.readdirSync(sqlDir).filter((f) => f.endsWith(".sql"))
  : [];
for (const f of sqlFiles.sort()) {
  const ok = SQL_ACTIVE.has(f);
  console.log(`${ok ? "  " : "! "}${f}${ok ? "" : " — not in SQL_ACTIVE allowlist (update README or archive)"}`);
  if (!ok) exitCode = 1;
}
for (const f of SQL_ACTIVE) {
  if (!sqlFiles.includes(f)) {
    console.log(`! MISSING expected active SQL: ${f}`);
    exitCode = 1;
  }
}

section("Scripts root vs package.json references");
const pkgText = readPkgScripts();
const scriptRoot = path.join(ROOT, "scripts");
const rootScripts = fs
  .readdirSync(scriptRoot)
  .filter((f) => /\.(mjs|ts|sh)$/.test(f) && fs.statSync(path.join(scriptRoot, f)).isFile());
const unreferenced = rootScripts.filter((f) => !pkgText.includes(`scripts/${f}`) && !pkgText.includes(f));
if (unreferenced.length) {
  console.log("Not referenced in package.json scripts (may still be CI/manual):");
  for (const f of unreferenced.sort()) console.log(`  - ${f}`);
} else {
  console.log("All root scripts appear in package.json.");
}

section("Legacy .from('fact_*') in src/ (compat views — Phase 4 backlog)");
const LEGACY_PHYSICAL = new Set([
  "fact_quy_trinh",
  "fact_lo_tiet_khuan",
  "fact_kho_giao_dich",
  "fact_kho_chi_tiet",
  "fact_su_co",
  "fact_bao_tri_thiet_bi",
]);
const legacyHits = [];
for (const file of walk(path.join(ROOT, "src"))) {
  const text = fs.readFileSync(file, "utf8");
  let m;
  const re = new RegExp(LEGACY_TABLE_RE.source, LEGACY_TABLE_RE.flags);
  while ((m = re.exec(text)) !== null) {
    legacyHits.push({ file: path.relative(ROOT, file), table: m[2] });
  }
}
if (legacyHits.length) {
  const byTable = new Map();
  for (const h of legacyHits) {
    if (!byTable.has(h.table)) byTable.set(h.table, []);
    byTable.get(h.table).push(h.file);
  }
  for (const [table, files] of [...byTable.entries()].sort()) {
    const block = LEGACY_PHYSICAL.has(table);
    console.log(`  ${block ? "!" : "·"} ${table}: ${files.length} file(s)${block ? " (physical rename backlog)" : " (compat view ok)"}`);
    if (block) exitCode = 1;
  }
} else {
  console.log("  No fact_/v_fact_ .from() patterns in src/.");
}

section("Docs inventory");
const docsRoot = path.join(ROOT, "docs");
function countMd(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) n += countMd(full);
    else if (ent.name.endsWith(".md")) n++;
  }
  return n;
}
console.log(`  Total docs/*.md: ${countMd(docsRoot)}`);
for (const sub of ["core", "wiki", "modules", "reference", "data", "archive", "sources"]) {
  const p = path.join(docsRoot, sub);
  if (fs.existsSync(p)) console.log(`  docs/${sub}: ${countMd(p)} md`);
}

section("Migrations (pilot chain only)");
const migDir = path.join(ROOT, "supabase/migrations");
const migs = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
console.log(`  ${migs.length} migration(s) in supabase/migrations/`);
const legacyMig = fs.existsSync(path.join(migDir, "archive_legacy"))
  ? fs.readdirSync(path.join(migDir, "archive_legacy")).filter((f) => f.endsWith(".sql")).length
  : 0;
console.log(`  archive_legacy/: ${legacyMig} file(s) (tarball SSOT in docs/archive/)`);

console.log("\n---");
if (exitCode === 0) console.log("repo:hygiene — no blocking issues.");
else console.log("repo:hygiene — review items marked with !");
process.exit(exitCode);
