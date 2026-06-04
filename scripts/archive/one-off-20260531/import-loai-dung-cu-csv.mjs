/**
 * Import CSSD_Management - DM_LoaiDungCu.csv → public.cssd_dm_loai_dung_cu (upsert ma_loai).
 * Khớp cấu trúc app: ma_loai/ten_loai + ma_loai_dung_cu/ten_loai_dung_cu + thuộc tính kỹ thuật.
 * TongSoLuong / TongSoLuongHT → mo_ta (không có cột riêng trong schema).
 * MaLoai trống nhưng có TenLoai → mã tạm IMPORT_LD_00001 (theo số dòng, log cảnh báo).
 * Không wipe bảng — tránh gãy FK cssd_dm_bo_dung_cu / cssd_dm_bo_dung_cu_chi_tiet.
 * Chạy: node --env-file=.env.local scripts/import-loai-dung-cu-csv.mjs [/path/DM_LoaiDungCu.csv]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT =
  "/Users/trinhhuunghia/Music/Music_High Quality/data for app/CSSD_Management - DM_LoaiDungCu.csv";

/** @returns {string[][]} */
function parseCsv(text) {
  const s = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQ = false;
        continue;
      }
      cur += c;
    } else {
      if (c === '"') {
        inQ = true;
        continue;
      }
      if (c === ",") {
        row.push(cur);
        cur = "";
        continue;
      }
      if (c === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
        continue;
      }
      cur += c;
    }
  }
  row.push(cur);
  if (row.some((x) => String(x).length > 0)) rows.push(row);
  return rows;
}

function emptyToNull(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function buildMoTa(tongSl, tongHt) {
  const parts = [];
  if (tongSl) parts.push(`Tổng SL (CSV): ${tongSl}`);
  if (tongHt) parts.push(`Tổng SL hiện tại (CSV): ${tongHt}`);
  return parts.length ? parts.join(" | ") : null;
}

const csvPath = process.argv[2] || CSV_DEFAULT;
if (!fs.existsSync(csvPath)) {
  console.error("Không có file CSV:", csvPath);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const grid = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = grid[0].map((h) => h.trim());
const expect = [
  "MaLoai",
  "TenLoai",
  "TongSoLuong",
  "TongSoLuongHT",
  "HinhDang",
  "KichThuoc",
  "CongDung",
  "KhaNangChiuNhiet",
  "PhuongPhapTietKhuan",
];
if (header.length !== expect.length || header.some((h, i) => h !== expect[i])) {
  console.error("Header CSV không khớp DM_LoaiDungCu chuẩn. Nhận:", header.join("|"));
  process.exit(1);
}

/** @type {Record<string, number>} */
const ix = {};
expect.forEach((name, j) => {
  ix[name] = j;
});

const iso = () => new Date().toISOString();
/** @type {Record<string, unknown>[]} */
const rows = [];

for (let r = 1; r < grid.length; r++) {
  const cols = grid[r];
  if (cols.length !== expect.length) {
    console.error(`Dòng ${r + 1}: ${cols.length} cột (mong ${expect.length})`, cols[0]);
    process.exit(1);
  }

  let maRaw = String(cols[ix.MaLoai] ?? "").trim();
  const ten = String(cols[ix.TenLoai] ?? "").trim();
  if (!ten) {
    console.error(`Dòng ${r + 1}: thiếu TenLoai`);
    process.exit(1);
  }
  if (!maRaw) {
    maRaw = `IMPORT_LD_${String(r).padStart(5, "0")}`;
    console.warn(`Dòng ${r + 1}: MaLoai trống — gán mã "${maRaw}" (sửa tay trong Quản trị nếu cần).`);
  }
  if (maRaw.length > 50) {
    console.error(`Dòng ${r + 1}: MaLoai > 50 ký tự (${maRaw.length})`, maRaw);
    process.exit(1);
  }

  rows.push({
    ma_loai: maRaw,
    ma_loai_dung_cu: maRaw,
    ten_loai: ten,
    ten_loai_dung_cu: ten,
    hinh_dang: emptyToNull(cols[ix.HinhDang]),
    kich_thuoc: emptyToNull(cols[ix.KichThuoc]),
    cong_dung: emptyToNull(cols[ix.CongDung]),
    kha_nang_chiu_nhiet: emptyToNull(cols[ix.KhaNangChiuNhiet]),
    phuong_phap_tiet_khuan: emptyToNull(cols[ix.PhuongPhapTietKhuan]),
    mo_ta: buildMoTa(String(cols[ix.TongSoLuong] ?? "").trim(), String(cols[ix.TongSoLuongHT] ?? "").trim()),
    is_active: true,
    updated_at: iso(),
  });
}

const BATCH = 80;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("cssd_dm_loai_dung_cu").upsert(chunk, { onConflict: "ma_loai" });
  if (error) {
    console.error(`Upsert batch ${Math.floor(i / BATCH) + 1}:`, error.message);
    process.exit(1);
  }
}

console.log(`OK: đã upsert ${rows.length} loại dụng cụ (ma_loai).`);
