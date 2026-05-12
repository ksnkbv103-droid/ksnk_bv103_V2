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

const envPath = join(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("[mdm:refresh] Khong tim thay .env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceKey) {
  console.error("[mdm:refresh] Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase.rpc("mdm_refresh_governance_suggestions");
if (error) {
  console.error("[mdm:refresh] RPC loi:", error.message);
  process.exit(1);
}

const inserted = Array.isArray(data) && data.length ? Number(data[0]?.inserted_count || 0) : 0;
console.log(`[mdm:refresh] inserted/open suggestions: ${inserted}`);

const { data: coverageRaw, error: coverageError } = await supabase
  .from("mdm_field_registry")
  .select("table_name")
  .eq("is_active", true);
if (coverageError) {
  console.error("[mdm:refresh] Khong doc duoc coverage:", coverageError.message);
  process.exit(1);
}

const coverageMap = new Map();
for (const row of coverageRaw || []) {
  const tableName = String(row.table_name || "").trim();
  if (!tableName) continue;
  coverageMap.set(tableName, (coverageMap.get(tableName) || 0) + 1);
}

const coverage = Array.from(coverageMap.entries())
  .map(([table_name, registered_fields]) => ({
    table_name,
    total_candidate_fields: registered_fields,
    registered_fields,
    missing_fields: 0,
  }))
  .sort((a, b) => b.registered_fields - a.registered_fields || a.table_name.localeCompare(b.table_name));

console.log("[mdm:refresh] coverage top:");
for (const row of (coverage || []).slice(0, 10)) {
  console.log(`- ${row.table_name}: missing=${row.missing_fields}, registered=${row.registered_fields}/${row.total_candidate_fields}`);
}
