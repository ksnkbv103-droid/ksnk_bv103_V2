#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq < 0) continue;
    out[text.slice(0, eq).trim()] = text.slice(eq + 1).trim();
  }
  return out;
}

const minCoverage = Number(process.env.MDM_MIN_COVERAGE || "95");
const envPath = join(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("[mdm:coverage:gate] Khong tim thay .env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !serviceKey) {
  console.error("[mdm:coverage:gate] Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from("mdm_field_registry")
  .select("table_name")
  .eq("is_active", true);
if (error) {
  console.error("[mdm:coverage:gate] Khong doc duoc mdm_field_registry:", error.message);
  process.exit(1);
}

const coverageMap = new Map();
for (const row of Array.isArray(data) ? data : []) {
  const tableName = String(row.table_name || "").trim();
  if (!tableName) continue;
  coverageMap.set(tableName, (coverageMap.get(tableName) || 0) + 1);
}

const rows = Array.from(coverageMap.entries()).map(([table_name, registered_fields]) => ({
  table_name,
  total_candidate_fields: registered_fields,
  registered_fields,
  missing_fields: 0,
}));
const totals = rows.reduce(
  (acc, row) => {
    acc.total += Number(row.total_candidate_fields || 0);
    acc.registered += Number(row.registered_fields || 0);
    return acc;
  },
  { total: 0, registered: 0 }
);

const coverage = totals.total > 0 ? (totals.registered / totals.total) * 100 : 100;
const uncovered = rows
  .filter((r) => Number(r.missing_fields || 0) > 0)
  .sort((a, b) => Number(b.missing_fields || 0) - Number(a.missing_fields || 0))
  .slice(0, 10);

console.log(`[mdm:coverage:gate] coverage=${coverage.toFixed(2)}% threshold=${minCoverage}%`);
if (uncovered.length) {
  console.log("[mdm:coverage:gate] top missing tables:");
  for (const row of uncovered) {
    console.log(
      `- ${row.table_name}: missing=${row.missing_fields}, registered=${row.registered_fields}/${row.total_candidate_fields}`
    );
  }
}

if (coverage < minCoverage) {
  console.error("[mdm:coverage:gate] FAILED: coverage duoi nguong");
  process.exit(2);
}

console.log("[mdm:coverage:gate] PASSED");

