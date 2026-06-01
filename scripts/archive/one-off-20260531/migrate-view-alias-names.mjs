#!/usr/bin/env node
/**
 * Phase 1 view alias cleanup: replace compat view names in src/ with prefix SSOT names.
 * Run: node scripts/migrate-view-alias-names.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const REPLACEMENTS = [
  ["v_sys_user_permissions", "v_sys_user_permissions"],
  ["v_sys_role_permissions_matrix", "v_sys_role_permissions_matrix"],
  ["v_sys_staff_auth_overview", "v_sys_staff_auth_overview"],
  ["v_qlcv_cong_viec_full", "v_qlcv_cong_viec_full"],
  ["v_qlcv_cong_viec_qua_han", "v_qlcv_qlcv_cong_viec_qua_han"],
  ["v_cssd_quy_trinh_full", "v_cssd_quy_trinh_full"],
  ["v_cssd_su_co_full", "v_cssd_su_co_full"],
  ["v_cssd_lo_tiet_khuan_full", "v_cssd_lo_tiet_khuan_full"],
  ["v_cssd_kho_hoa_chat_ton_lo", "v_cssd_kho_hoa_chat_ton_lo"],
  ["v_cssd_thiet_bi_full", "v_cssd_thiet_bi_full"],
  ["v_cssd_hoa_chat_full", "v_cssd_hoa_chat_full"],
  ["v_cssd_bo_dung_cu_full", "v_cssd_bo_dung_cu_full"],
  ["v_cssd_bo_dung_cu_chi_tiet_full", "v_cssd_bo_dung_cu_chi_tiet_full"],
  ["v_cssd_bo_dung_cu_summary", "v_cssd_bo_dung_cu_summary"],
  ["v_cssd_loai_dung_cu_summary", "v_cssd_loai_dung_cu_summary"],
  ["v_gstt_giam_sat_chung_sessions_full", "v_gstt_giam_sat_chung_sessions_full"],
  ["v_gstt_giam_sat_vst_sessions_full", "v_gstt_giam_sat_vst_sessions_full"],
  ["v_gstt_giam_sat_vst_full", "v_gstt_giam_sat_vst_full"],
  ["v_nkbv_su_kien_full", "v_nkbv_su_kien_full"],
  ["v_gstt_bang_kiem_full", "v_gstt_bang_kiem_full"],
  ["v_gstt_tieu_chi_bang_kiem_full", "v_gstt_tieu_chi_bang_kiem_full"],
  ["v_mdm_khoa_phong_full", "v_mdm_khoa_phong_full"],
  ["v_gstt_gsc_dashboard_rows", "v_gstt_gsc_dashboard_rows"],
  ["v_gstt_vst_hotpath", "v_gstt_vst_hotpath"],
];

const PATTERN = /v_fact_|v_dm_|v_auth_|v_qlcv_cong_viec_qua_han|v_gsc_dashboard|v_gstt_vst_hotpath|v_sys_role_permissions_matrix|v_staff_auth/;
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(name)) && PATTERN.test(readFileSync(p, "utf8"))) out.push(p);
  }
  return out;
}

const files = [...walk("src"), ...walk("scripts")];

let changed = 0;
for (const file of files) {
  let text = readFileSync(file, "utf8");
  const before = text;
  for (const [from, to] of REPLACEMENTS) {
    text = text.split(from).join(to);
  }
  if (text !== before) {
    writeFileSync(file, text, "utf8");
    changed++;
    console.log("updated:", file);
  }
}
console.log(`Done. ${changed} file(s) updated.`);
