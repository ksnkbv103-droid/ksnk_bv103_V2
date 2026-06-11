#!/usr/bin/env node
/**
 * CLI audit: đối chiếu supabase/seed.sql với src/lib/domain/gsc-canonical-36-scoring.ts
 * Chạy: node scripts/audit-gsc-canonical-36-scoring.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seed = fs.readFileSync(path.join(root, "supabase/seed.sql"), "utf8");

/** @type {Array<{ma_bk:string,cach_tinh_diem:string,loai_giam_sat:string}>} */
const SSOT = [
  ["BM.03.03", "TY_LE", "DANH_GIA_HE_THONG"],
  ["BM.07.02", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.07.03", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.08.01", "TY_LE", "TUAN_THU"],
  ["BM.09.01", "TY_LE", "TUAN_THU"],
  ["BM.10.01", "TY_LE", "TUAN_THU"],
  ["BM.14.01", "TY_LE", "TUAN_THU"],
  ["BM.31.03", "TY_LE", "TUAN_THU"],
  ["BM.17.01", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.15.01", "TY_LE", "TUAN_THU"],
  ["BM.16.01", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.18.02", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.19.01", "TY_LE", "TUAN_THU"],
  ["BM.19.02", "NHAT_KY", "NHAT_KY_VAN_HANH"],
  ["BM.20.02", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.22.04", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.QĐ.19.03", "TY_LE", "TUAN_THU"],
  ["BM.21.04", "TY_LE", "TUAN_THU"],
  ["BM.25.01", "TRON_GOI", "TUAN_THU"],
  ["BM.25.03", "TRON_GOI", "TUAN_THU"],
  ["BM.27.01", "TRON_GOI", "TUAN_THU"],
  ["BM.27.02", "TRON_GOI", "TUAN_THU"],
  ["BM.26.01", "TRON_GOI", "TUAN_THU"],
  ["BM.24.02", "TRON_GOI", "TUAN_THU"],
  ["BM.11.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.12.01", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.QĐ.20.01", "DAT_KHONG_DAT", "TUAN_THU"],
  ["BM.13.01", "TY_LE", "TUAN_THU"],
  ["BM.12.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.08.01", "NHAT_KY", "NHAT_KY_VAN_HANH"],
  ["BM.QĐ.02.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.03.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.09.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.17.01", "NHAT_KY", "NHAT_KY_VAN_HANH"],
  ["BM.QĐ.16.01", "TY_LE", "TUAN_THU"],
  ["BM.QĐ.18.02", "TY_LE", "TUAN_THU"],
].map(([ma_bk, cach_tinh_diem, loai_giam_sat]) => ({ ma_bk, cach_tinh_diem, loai_giam_sat }));

function parseSeed() {
  const start = seed.indexOf('INSERT INTO "public"."gstt_dm_bang_kiem"');
  const end = seed.indexOf(";\n\n", start);
  const insert = seed.slice(start, end);
  const parts = insert.split(/\),\s*\n\t\(/);
  const out = new Map();
  for (let raw of parts) {
    raw = raw.replace(/^INSERT INTO[^()]+\(\s*/, "").replace(/\)\s*$/, "");
    const ma = raw.match(/'((?:BM\.[^']+|JCI\.[^']+|APSIC\.[^']+))'/);
    if (!ma) continue;
    const tails = [...raw.matchAll(/'(TY_LE|TRON_GOI|DAT_KHONG_DAT|NHAT_KY)',\s*'([^']+)'/g)];
    const t = tails.at(-1);
    const loai = raw.match(
      /'(TUAN_THU|NHAT_KY_VAN_HANH|DANH_GIA_HE_THONG)',\s*'(NHAN_VIEN|NGUOI_BENH|MOI_TRUONG|THIET_BI|ME_TIET_KHUAN)'/,
    );
    if (t && loai) out.set(ma[1], { cach: t[1], loai: loai[1] });
  }
  return out;
}

const seedMap = parseSeed();
let ok = 0;
let fail = 0;
console.log("ma_bk\tseed_cach\texpected\tstatus");
for (const exp of SSOT) {
  const row = seedMap.get(exp.ma_bk);
  const match = row && row.cach === exp.cach_tinh_diem && row.loai === exp.loai_giam_sat;
  console.log(
    [exp.ma_bk, row?.cach ?? "MISSING", exp.cach_tinh_diem, match ? "OK" : "MISMATCH"].join("\t"),
  );
  if (match) ok++;
  else fail++;
}
console.log(`\nSummary: ${ok}/36 OK, ${fail} mismatch`);
process.exit(fail > 0 ? 1 : 0);
