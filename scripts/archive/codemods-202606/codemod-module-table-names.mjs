#!/usr/bin/env node
/**
 * Replace legacy dm_* / fact_* / rel_* compat names with module-prefixed SSOT tables/views.
 * Run: node scripts/codemod-module-table-names.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Longest-first to avoid partial replacement. */
const REPLACEMENTS = [
  ["fact_giam_sat_vst_sessions", "gstt_fact_vst_sessions"],
  ["fact_giam_sat_chung_sessions", "gstt_fact_chung_sessions"],
  ["fact_giam_sat_vst", "gstt_fact_vst"],
  ["fact_cong_viec_hoat_dong", "qlcv_fact_cong_viec_hoat_dong"],
  ["fact_cong_viec_dinh_ky", "qlcv_fact_cong_viec_dinh_ky"],
  ["fact_cong_viec", "qlcv_fact_cong_viec"],
  ["fact_nkbv_mau_so_phau_thuat", "nkbv_fact_mau_so_phau_thuat"],
  ["fact_nkbv_mau_so_daily", "nkbv_fact_mau_so_daily"],
  ["fact_kho_dung_cu_giao_dich", "cssd_fact_kho_giao_dich"],
  ["fact_nkbv_su_kien", "nkbv_fact_su_kien"],
  ["fact_nkbv_benh_an", "nkbv_fact_benh_an"],
  ["fact_nkbv_vi_sinh", "nkbv_fact_vi_sinh"],
  ["dm_bo_dung_cu_phan_bo", "cssd_dm_bo_phan_bo"],
  ["dm_bo_dung_cu_chi_tiet", "cssd_dm_bo_dung_cu_chi_tiet"],
  ["dm_loai_may_tiet_khuan", "cssd_dm_loai_may"],
  ["dm_trang_thai_nkbv_ca", "nkbv_dm_trang_thai_ca"],
  ["dm_trang_thai_cong_viec", "qlcv_dm_trang_thai_cong_viec"],
  ["dm_hinh_thuc_giam_sat", "gstt_dm_hinh_thuc_giam_sat"],
  ["dm_cach_thuc_giam_sat", "gstt_dm_cach_thuc_giam_sat"],
  ["dm_khu_vuc_giam_sat", "gstt_dm_khu_vuc_giam_sat"],
  ["dm_nkbv_cdc_baselines", "nkbv_dm_cdc_baseline"],
  ["dm_tieu_chi_bang_kiem", "gstt_dm_tieu_chi_bang_kiem"],
  ["dm_bo_dung_cu", "cssd_dm_bo_dung_cu"],
  ["dm_loai_dung_cu", "cssd_dm_loai_dung_cu"],
  ["dm_loai_cong_viec", "qlcv_dm_loai_cong_viec"],
  ["dm_loai_su_co", "cssd_dm_loai_su_co"],
  ["dm_tram_cssd", "cssd_dm_tram"],
  ["dm_khoa_phong", "mdm_dm_khoa_phong"],
  ["dm_bang_kiem", "gstt_dm_bang_kiem"],
  ["dm_thiet_bi", "cssd_dm_thiet_bi"],
  // dm_hoa_chat_id là TÊN CỘT FK — không đổi; chỉ bảng:
  ["dm_hoa_chat", "cssd_dm_hoa_chat"],
  ["dm_chuc_danh", "mdm_dm_chuc_danh"],
  ["dm_chuc_vu", "mdm_dm_chuc_vu"],
  ["dm_khoi_khoa", "mdm_dm_khoi_khoa"],
  ["dm_nghe_nghiep", "mdm_dm_nghe_nghiep"],
  ["dm_to_cong_tac", "mdm_dm_to_cong_tac"],
  ["dm_loai_nkbv", "nkbv_dm_loai"],
  ["dm_permissions", "sys_permissions"],
  ["dm_lookup_value", "sys_lookup_value"],
  ["dm_roles", "sys_roles"],
  ["rel_role_permissions", "sys_role_permissions"],
  ["rel_user_roles", "sys_user_roles"],
];

const TARGET_DIRS = ["src", "scripts"];
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const SKIP = new Set(["codemod-module-table-names.mjs", "guard-legacy-table-names.mjs"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(name)) && !SKIP.has(name)) out.push(p);
  }
  return out;
}

function apply(text) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const before = fs.readFileSync(file, "utf8");
    const after = apply(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed++;
      console.log(path.relative(ROOT, file));
    }
  }
}
console.log(`\nUpdated ${changed} files.`);
