#!/usr/bin/env node
/**
 * CI guard: active SQL/seed không chứa pattern legacy (compat dm_, fact_, KV_TR_, …).
 * Archive scripts/sql-20260531 được bỏ qua.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const scanRoots = [
  join(root, "scripts/sql"),
  join(root, "scripts/master-data-cutover-postcheck.sql"),
  join(root, "supabase/seed.sql"),
  join(root, "supabase/seeds"),
];

const skipDirs = new Set(["archive", "pilot-dashboard-explain"]);
const allowlist = new Set([
  "scripts/sql/admin-slice-pre-apply-probe.sql",
  "scripts/sql/ssot-legacy-guard.sql",
]);
const patterns = [
  { re: /\bKV_(TR|DO|VA|XA)_/g, label: "khu_vuc prefix cũ KV_TR_/DO_/VA_/XA_" },
  { re: /['"]fact_giam_sat_/g, label: "fact_giam_sat_* compat" },
  { re: /['"]fact_cong_viec['"]/g, label: "fact_cong_viec compat" },
  { re: /['"]dm_khoa_phong['"]/g, label: "dm_khoa_phong compat" },
  { re: /['"]dm_tram_cssd['"]/g, label: "dm_tram_cssd compat" },
  { re: /fn_fact_cong_viec_spawn_dinh_ky_hom_nay/g, label: "fn_fact_cong_viec_spawn legacy RPC" },
];

/** @param {string} dir */
function walkSql(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkSql(p));
    else if (name.endsWith(".sql") && !name.startsWith("_tmp-")) out.push(p);
  }
  return out;
}

/** @type {{ file: string; label: string; match: string }[]} */
const hits = [];

for (const entry of scanRoots) {
  const files = statSync(entry).isDirectory() ? walkSql(entry) : [entry];
  for (const file of files) {
    const rel = relative(root, file);
    if (allowlist.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    for (const { re, label } of patterns) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (m) {
        hits.push({ file: relative(root, file), label, match: m[0] });
      }
    }
  }
}

if (hits.length) {
  console.error("[legacy:sql:guard] Phát hiện pattern SQL lạc hậu trong file active:\n");
  for (const h of hits) {
    console.error(`  - ${h.file}: ${h.label} (${h.match})`);
  }
  process.exit(1);
}

console.log("[legacy:sql:guard] OK — không có pattern legacy trong SQL active.");
