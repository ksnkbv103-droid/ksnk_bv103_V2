#!/usr/bin/env node
/**
 * Trước sunset: đếm dòng legacy trong hub.
 * Sau khi DROP bảng `danh_muc_tuy_bien`: thoát 0 (không còn hub để kiểm tra).
 */
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
  console.error("[mdm:fallback:audit] Khong tim thay .env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !serviceKey) {
  console.error("[mdm:fallback:audit] Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const migratedTypes = [
  "KHOI_KHOA",
  "KHOA_PHONG",
  "TO_CONG_TAC",
  "CHUC_VU",
  "CHUC_DANH",
  "VAI_TRO_HE_THONG_KSNK",
  "KHU_VUC_GIAM_SAT",
  "NGHE_NGHIEP",
  "LOAI_DUNG_CU",
  "LOAI_SU_CO",
  "LOAI_MAY_TIET_KHUAN",
];

const failOnLegacy =
  process.env.MDM_LEGACY_FAIL_ON_ROWS === "1" || process.argv.includes("--strict");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function isHubTableMissingError(err) {
  if (!err) return false;
  const msg = String(err.message || err.details || err.hint || "");
  const code = String((err && err.code) || "");
  if (code === "PGRST205" || code === "42P01") return true;
  return /does not exist|Could not find the table|schema cache|relation.*does not exist/i.test(msg);
}

const smoke = await supabase.from("danh_muc_tuy_bien").select("id", { head: true, count: "exact" });
if (smoke.error) {
  if (isHubTableMissingError(smoke.error)) {
    console.log("[mdm:fallback:audit] Bang hub da DROP — khong con legacy de dem. OK.");
    process.exit(0);
  }
  console.error("[mdm:fallback:audit] Loi doc DB:", String(smoke.error.message || smoke.error));
  process.exit(1);
}

const pageSize = 1000;
const allRows = [];
for (let from = 0; ; from += pageSize) {
  const { data: page, error } = await supabase
    .from("danh_muc_tuy_bien")
    .select("loai_danh_muc")
    .in("loai_danh_muc", migratedTypes)
    .range(from, from + pageSize - 1);
  if (error) {
    if (isHubTableMissingError(error)) {
      console.log("[mdm:fallback:audit] Bang hub da DROP — khong con legacy de dem. OK.");
      process.exit(0);
    }
    console.error("[mdm:fallback:audit] Khong doc duoc danh_muc_tuy_bien:", error.message);
    process.exit(1);
  }
  allRows.push(...(page || []));
  if (!page?.length || page.length < pageSize) break;
}

const grouped = new Map();
for (const row of allRows) {
  const k = String(row.loai_danh_muc || "");
  grouped.set(k, (grouped.get(k) || 0) + 1);
}

console.log("[mdm:fallback:audit] Legacy rows in migrated types:");
for (const type of migratedTypes) {
  console.log(`- ${type}: ${grouped.get(type) || 0}`);
}
const total = allRows.length;
console.log(`[mdm:fallback:audit] total_legacy_rows=${total}`);

if (failOnLegacy && total > 0) {
  console.error("[mdm:fallback:audit] FAILED strict: van con dong legacy trong danh_muc_tuy_bien (xem muc tieu sunset).");
  process.exit(2);
}
