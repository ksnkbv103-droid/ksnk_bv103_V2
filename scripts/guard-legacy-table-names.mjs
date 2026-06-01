#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const TARGET_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Bảng/view rename pilot — không dùng tên cũ khi SSOT là cssd_, gstt_, qlcv_ prefix.
const PHYSICAL_RENAME_BLOCKLIST = [
  "fact_quy_trinh",
  "fact_quy_trinh_thanh_phan",
  "fact_lo_tiet_khuan",
  "fact_kho_giao_dich",
  "fact_kho_chi_tiet",
  "fact_su_co",
  "fact_bao_tri_thiet_bi",
  "fact_cssd_lifecycle_event",
  "fact_cssd_dieu_chuyen_thanh_phan",
  "fact_kho_hoa_chat_giao_dich",
];

const LEGACY_TABLES = [
  "ho_so_nhan_vien",
  "roles",
  "permissions",
  "user_roles",
  "role_permissions",
  "giam_sat_chung_sessions",
  "giam_sat_chung_results",
  "giam_sat_vst_sessions",
  "giam_sat_vst",
  "giam_sat_nkbv_ca",
  "kho_giao_dich",
  "kho_chi_tiet",
  "danh_muc_bang_kiem",
  "tieu_chi_bang_kiem",
  ...PHYSICAL_RENAME_BLOCKLIST,
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (TARGET_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const hits = [];
  for (const t of LEGACY_TABLES) {
    const re = new RegExp(`from\\((['"])${t}\\1\\)`, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(0, m.index);
      const line = before.split("\n").length;
      hits.push({ table: t, line, rel });
    }
  }
  return hits;
}

if (!fs.existsSync(SRC_DIR)) {
  console.error("Missing src directory, cannot run legacy table guard.");
  process.exit(1);
}

const files = walk(SRC_DIR);
const violations = files.flatMap(checkFile);

if (violations.length === 0) {
  console.log("Legacy table guard passed.");
  process.exit(0);
}

console.error("Legacy table guard failed. Found old table names in runtime code:");
for (const v of violations) {
  console.error(`- ${v.rel}:${v.line} -> ${v.table}`);
}
process.exit(1);
