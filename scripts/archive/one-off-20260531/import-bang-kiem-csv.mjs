/**
 * Import CauHinh_BangKiem_ChiTiet.csv vào danh_muc_bang_kiem + tieu_chi_bang_kiem.
 * CSV: dấu ;, UTF-8 có BOM; cột Mã BK, Tên Bảng kiểm, Nhóm chuyên đề, STT, Nội dung tiêu chí, Mô tả.
 *
 * Nguy hiểm: XÓA toàn bộ tiêu chí + danh mục bảng kiểm cũ.
 * Chạy: node --env-file=.env.local scripts/import-bang-kiem-csv.mjs [/path/file.csv]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT = "/Users/trinhhuunghia/Desktop/CauHinh_BangKiem_ChiTiet.csv";

/** @returns {string[][]} */
function parseSemiCsvLines(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  /** @type {string[][]} */
  const rows = [];
  const lines = normalized.split("\n").filter((l) => l.length > 0);
  for (const line of lines) {
    /** @type {string[]} */
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (!inQ && c === ";") {
        cols.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
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

const raw = fs.readFileSync(csvPath, "utf8");
const grid = parseSemiCsvLines(raw);
if (grid.length < 2) {
  console.error("CSV không có dữ liệu");
  process.exit(1);
}

const header = grid[0].map((h) => h.replace(/^\uFEFF/, "").trim());
const ix = Object.fromEntries(header.map((h, i) => [h, i]));
const hk = ["Mã BK", "Tên Bảng kiểm", "Nhóm chuyên đề", "STT", "Nội dung tiêu chí", "Mô tả"];
for (const k of hk) {
  if (ix[k] === undefined) {
    console.error("CSV thiếu cột bắt buộc:", k, "| header thực tế:", header.join("; "));
    process.exit(1);
  }
}

/** @type {Map<string, { ma_bk: string, ten_bang_kiem: string, nhom_chuyen_de: string, chiTiet: { stt: number, noi_dung: string, ghi_chu: string | null }[] }>} */
const byMaBk = new Map();

for (let r = 1; r < grid.length; r++) {
  const row = grid[r];
  const ma_bk = String(row[ix["Mã BK"]] ?? "").trim();
  const ten_bang_kiem = String(row[ix["Tên Bảng kiểm"]] ?? "").trim();
  const nhom_chuyen_de = String(row[ix["Nhóm chuyên đề"]] ?? "").trim();
  const sttRaw = String(row[ix.STT] ?? "").trim();
  const noi_dung = String(row[ix["Nội dung tiêu chí"]] ?? "").trim();
  const moTa = String(row[ix["Mô tả"]] ?? "").trim();

  if (!ma_bk || !ten_bang_kiem) {
    console.warn(`Bỏ qua dòng ${r + 1}: thiếu Mã BK hoặc Tên bảng kiểm`);
    continue;
  }
  const stt = Number.parseInt(sttRaw, 10);
  if (!Number.isFinite(stt)) {
    console.error(`Dòng ${r + 1}: STT không hợp lệ "${sttRaw}" (${ma_bk})`);
    process.exit(1);
  }
  if (!noi_dung) {
    console.error(`Dòng ${r + 1}: thiếu nội dung tiêu chí (${ma_bk})`);
    process.exit(1);
  }

  let g = byMaBk.get(ma_bk);
  if (!g) {
    g = { ma_bk, ten_bang_kiem, nhom_chuyen_de, chiTiet: [] };
    byMaBk.set(ma_bk, g);
  } else {
    if (g.ten_bang_kiem !== ten_bang_kiem || g.nhom_chuyen_de !== nhom_chuyen_de) {
      console.warn(`Cảnh báo ${ma_bk}: tên hoặc nhóm khác các dòng trước — giữ giá trị dòng đầu.`);
    }
  }
  g.chiTiet.push({ stt, noi_dung, ghi_chu: moTa || null });
}

if (!byMaBk.size) {
  console.error("Không có bản ghi hợp lệ.");
  process.exit(1);
}

/** Xóa toàn bộ (PostgREST thường cần filter). */
async function wipeTable(table) {
  const cutoff = new Date(Date.now() + 86400000).toISOString();
  const { error } = await supabase.from(table).delete().lte("created_at", cutoff);
  if (error) throw new Error(`${table}: ${error.message}`);
}

await wipeTable("tieu_chi_bang_kiem");
await wipeTable("danh_muc_bang_kiem");
console.log("Đã xóa hết tieu_chi_bang_kiem và danh_muc_bang_kiem.");

const iso = () => new Date().toISOString();
const parents = [...byMaBk.values()].sort((a, b) => a.ma_bk.localeCompare(b.ma_bk, "vi"));
/** @type {Record<string, unknown>[]} */
const parentRows = parents.map((p) => ({
  ma_bk: p.ma_bk,
  ten_bang_kiem: p.ten_bang_kiem,
  nhom_chuyen_de: p.nhom_chuyen_de || null,
  mo_ta: null,
  loai_hinh_giam_sat: "TRUC_TIEP",
  is_active: true,
  is_system: false,
  updated_at: iso(),
  created_at: iso(),
}));

const { data: insertedParents, error: insBK } = await supabase
  .from("danh_muc_bang_kiem")
  .insert(parentRows)
  .select("id,ma_bk");

if (insBK || !insertedParents?.length) {
  console.error("Insert danh_muc_bang_kiem thất bại:", insBK?.message);
  process.exit(1);
}

const bkIdByMa = new Map(insertedParents.map((x) => [x.ma_bk, x.id]));

/** @type {Record<string, unknown>[]} */
const childRows = [];
for (const p of parents) {
  const bkId = bkIdByMa.get(p.ma_bk);
  if (!bkId) {
    console.error("Thiếu id sau insert:", p.ma_bk);
    process.exit(1);
  }
  const sorted = [...p.chiTiet].sort((a, b) => a.stt - b.stt);
  for (const c of sorted) {
    childRows.push({
      ma_tc: `${p.ma_bk}__${String(c.stt).padStart(4, "0")}`,
      bang_kiem_id: bkId,
      stt: c.stt,
      noi_dung: c.noi_dung,
      ghi_chu: c.ghi_chu,
      diem_toi_da: 1,
      is_active: true,
      updated_at: iso(),
      created_at: iso(),
    });
  }
}

const BATCH = 50;
for (let i = 0; i < childRows.length; i += BATCH) {
  const batch = childRows.slice(i, i + BATCH);
  const { error: tcErr } = await supabase.from("tieu_chi_bang_kiem").insert(batch);
  if (tcErr) {
    console.error(`Insert tieu_chi batch ${Math.floor(i / BATCH) + 1}:`, tcErr.message);
    process.exit(1);
  }
}

console.log(`OK: ${parents.length} bảng kiểm, ${childRows.length} tiêu chí.`);
