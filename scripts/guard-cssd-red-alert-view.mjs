#!/usr/bin/env node
/**
 * Local guard: app không được select is_red_alert từ v_cssd_quy_trinh_full
 * (cột có thể chưa có trên localhost / prod trước migrate).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const BAD = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name)) scan(p);
  }
}

function scan(file) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("v_cssd_quy_trinh_full")) return;
  // Khối .from("v_cssd_quy_trinh_full").select(...) không được chứa is_red_alert
  const re = /\.from\(\s*["']v_cssd_quy_trinh_full["']\s*\)\s*\.select\(\s*(?:`[^`]*`|["'][^"']*["']|\([\s\S]*?\))/g;
  let m;
  while ((m = re.exec(text))) {
    if (/is_red_alert/.test(m[0])) {
      BAD.push(`${file}: select is_red_alert từ v_cssd_quy_trinh_full`);
    }
  }
  // Fallback: cùng đoạn gần nhau
  const idx = text.indexOf('from("v_cssd_quy_trinh_full")');
  if (idx >= 0) {
    const window = text.slice(idx, idx + 400);
    if (/select\([\s\S]*is_red_alert/.test(window)) {
      const msg = `${file}: cửa sổ sau from(v_cssd_quy_trinh_full) có is_red_alert`;
      if (!BAD.includes(msg)) BAD.push(msg);
    }
  }
  const idx2 = text.indexOf("from('v_cssd_quy_trinh_full')");
  if (idx2 >= 0) {
    const window = text.slice(idx2, idx2 + 400);
    if (/select\([\s\S]*is_red_alert/.test(window)) {
      const msg = `${file}: cửa sổ sau from(v_cssd_quy_trinh_full) có is_red_alert`;
      if (!BAD.includes(msg)) BAD.push(msg);
    }
  }
}

walk(ROOT);

if (BAD.length) {
  console.error("[guard:cssd-red-alert-view] FAIL");
  for (const b of BAD) console.error(" -", b);
  process.exit(1);
}
console.log("[guard:cssd-red-alert-view] OK — không select is_red_alert từ v_cssd_quy_trinh_full");
