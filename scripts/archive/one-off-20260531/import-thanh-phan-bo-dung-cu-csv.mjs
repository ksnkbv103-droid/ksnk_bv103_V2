/**
 * Import CSSD_Management - DM_ThanhPhanBoDungCu.csv → dm_bo_dung_cu_chi_tiet.
 * - Link: MaBo → bo_dung_cu_id, MaLoai → dm_loai_dung_cu.ma_loai.
 * - Xóa toàn bộ chi tiết của các ma_bo có trong CSV, rồi insert lại (đồng bộ đúng bộ — CSV là nguồn đúng).
 * - MaLoai trống: tự tạo dm_loai_dung_cu mã IMPORT_TP_{số_dòng}.
 * - Trùng (MaBo+MaThanhPhan): hậu tố _n trong ma_chi_tiet (≤50 ký tự).
 *
 * Mặc định bỏ qua dòng thiếu ma_bo trong dm_bo_dung_cu (cảnh báo).
 * `--strict`: dừng nếu thiếu bất kỳ MaBo / MaLoai nào trong DB (chưa gồm IMPORT_TP_* sẽ tạo).
 *
 * node --env-file=.env.local scripts/import-thanh-phan-bo-dung-cu-csv.mjs [/path/file.csv] [--strict]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT =
  "/Users/trinhhuunghia/Music/Music_High Quality/data for app/CSSD_Management - DM_ThanhPhanBoDungCu.csv";

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

/** @returns {string | null} */
function nz(s) {
  const t = String(s ?? "").trim();
  return t ? t : null;
}

function parseSoLuong(s, line) {
  const t = String(s ?? "").trim();
  if (!t) return 1;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n)) {
    console.error(`Dòng ${line}: SoLuong không phải số: "${t}"`);
    process.exit(1);
  }
  return Math.max(0, n);
}

function truncateMa(ma, max = 50) {
  const m = String(ma || "").slice(0, max);
  if (String(ma).length > max) console.warn(`Cắt ma_chi_tiet xuống ${max} ký tự:`, ma);
  return m;
}

/** @returns {boolean} */
function argFlag(name) {
  return process.argv.includes(name);
}

const csvPath = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null) || CSV_DEFAULT;
const strictBo = argFlag("--strict");

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
const expect = ["MaThanhPhan", "MaBo", "MaLoai", "TenDungCu", "HinhDang", "SoLuong", "SLuongHT", "DonVi", "SoSerials_MaKhac", "GhiChu"];
const header = grid[0].map((h) => h.trim());
if (header.length !== expect.length || expect.some((n, i) => header[i] !== n)) {
  console.error("Header không khớp DM_ThanhPhanBoDungCu chuẩn:", header.join("|"));
  process.exit(1);
}

/** @type {Record<string, number>} */
const ix = {};
expect.forEach((n, i) => {
  ix[n] = i;
});

/** @type {{ line: number; ma_tp: string; ma_bo: string; ma_loai: string | null; ten: string; hinh_dang: string | null; so_luong: number; sl_ht: string | null; don_vi: string | null; serial: string | null; ghi: string | null }[]} */
const parsed = [];

for (let r = 1; r < grid.length; r++) {
  const cols = grid[r];
  if (cols.length !== expect.length) {
    console.error(`Dòng ${r + 1}: ${cols.length} cột`);
    process.exit(1);
  }
  const ma_tp = nz(cols[ix.MaThanhPhan]);
  const ma_bo = nz(cols[ix.MaBo]);
  let ma_loai = nz(cols[ix.MaLoai]);
  const ten = nz(cols[ix.TenDungCu]);
  if (!ma_tp || !ma_bo || !ten) {
    console.error(`Dòng ${r + 1}: thiếu MaThanhPhan / MaBo / TenDungCu`);
    process.exit(1);
  }
  if (!ma_loai)
    ma_loai = null;
  parsed.push({
    line: r + 1,
    ma_tp,
    ma_bo,
    ma_loai,
    ten,
    hinh_dang: nz(cols[ix.HinhDang]),
    so_luong: parseSoLuong(cols[ix.SoLuong], r + 1),
    sl_ht: nz(cols[ix.SLuongHT]),
    don_vi: nz(cols[ix.DonVi]),
    serial: nz(cols[ix.SoSerials_MaKhac]),
    ghi: nz(cols[ix.GhiChu]),
  });
}

const distinctMasAll = [...new Set(parsed.map((p) => p.ma_bo))];
const { data: bos, error: eb } = await supabase.from("dm_bo_dung_cu").select("id,ma_bo").in("ma_bo", distinctMasAll);
if (eb) throw eb;
const boIdByMa = new Map((bos || []).map((b) => [String(b.ma_bo).trim(), b.id]));

/** @type {typeof parsed} */
const parsedOkBo = parsed.filter((p) => boIdByMa.has(p.ma_bo));
const skippedLinesOnBo = parsed.length - parsedOkBo.length;
/** @type {string[]} */
const missingBo = distinctMasAll.filter((m) => !boIdByMa.has(m));
const distinctMas = [...new Set(parsedOkBo.map((p) => p.ma_bo))];

if (missingBo.length && strictBo) {
  console.error(
    "Thiếu dm_bo_dung_cu.ma_bo (--strict):",
    missingBo.slice(0, 40).join(", "),
    missingBo.length > 40 ? `… (${missingBo.length})` : "",
  );
  process.exit(1);
}
if (missingBo.length && !strictBo) {
  console.warn(
    `Bỏ qua ${skippedLinesOnBo} dòng vì không có dm_bo_dung_cu: ${missingBo.slice(0, 30).join(", ")}${missingBo.length > 30 ? ` … (+${missingBo.length - 30} mã bộ)` : ""}`,
  );
}

if (!parsedOkBo.length) {
  console.error("Không còn dòng nào sau khi lọc MaBo — kiểm tra DM_BoDungCu và --strict.");
  process.exit(1);
}

const loaiMas = [...new Set(parsedOkBo.map((p) => p.ma_loai).filter(Boolean))];
/** @type {Map<string,string>} syntheticLoaiMaByLine — dòng không MaLoai */
const synthByLine = new Map();
for (const p of parsedOkBo) {
  if (!p.ma_loai) {
    const auto = `IMPORT_TP_${String(p.line).padStart(5, "0")}`;
    synthByLine.set(p.line, auto);
    loaiMas.push(auto);
  }
}

/** @type {Record<string, unknown>[]} */
const synthRows = [...synthByLine.entries()].map(([line, ma]) => {
  const p = parsedOkBo.find((x) => x.line === line);
  return {
    ma_loai: ma,
    ma_loai_dung_cu: ma,
    ten_loai: p?.ten || ma,
    ten_loai_dung_cu: p?.ten || ma,
    is_active: true,
    mo_ta: `Tự sinh khi MaLoai trống trong DM_ThanhPhanBoDungCu (dòng ${line})`,
    updated_at: new Date().toISOString(),
  };
});
if (synthRows.length) {
  const { error: eu } = await supabase.from("dm_loai_dung_cu").upsert(synthRows, { onConflict: "ma_loai" });
  if (eu) {
    console.error("Upsert loại synth:", eu.message);
    process.exit(1);
  }
}

const uniqLoai = [...new Set(loaiMas.filter(Boolean))];
/** @type {Map<string,string>} */
const loaiIdByMa = new Map();
for (let j = 0; j < uniqLoai.length; j += 200) {
  const part = uniqLoai.slice(j, j + 200);
  const { data: loais, error: el } = await supabase.from("dm_loai_dung_cu").select("id,ma_loai").in("ma_loai", part);
  if (el) throw el;
  for (const row of loais || []) loaiIdByMa.set(String(row.ma_loai).trim(), row.id);
}

/** @type {string[]} */
const missingLo = [];
for (const ml of loaiMas) {
  if (!ml) continue;
  if (!loaiIdByMa.has(ml)) missingLo.push(ml);
}
if (missingLo.length) {
  console.error("Thiếu dm_loai_dung_cu.ma_loai (đã import DM_LoaiDungCu trước?):", [...new Set(missingLo)].slice(0, 25).join(", "));
  process.exit(1);
}

/** @type {Map<string, number>} */
const dupCount = new Map();
const iso = () => new Date().toISOString();
/** @type {Record<string, unknown>[]} */
const inserts = [];

function buildGhi(p) {
  const parts = ["Nguồn import: DM_ThanhPhanBoDungCu.csv"];
  if (p.hinh_dang) parts.push(`Hình dạng: ${p.hinh_dang}`);
  if (p.sl_ht) parts.push(`SL hiện tại (CSV): ${p.sl_ht}`);
  if (p.don_vi) parts.push(`Đơn vị: ${p.don_vi}`);
  if (p.serial) parts.push(`Số serial / mã khác: ${p.serial}`);
  if (p.ghi) parts.push(`Ghi chú: ${p.ghi}`);
  return parts.join("\n");
}

for (const p of parsedOkBo) {
  const maLoaiResolved = p.ma_loai || synthByLine.get(p.line);
  const loai_id = maLoaiResolved ? loaiIdByMa.get(maLoaiResolved) : null;
  const bo_id = boIdByMa.get(p.ma_bo);

  const dkey = `${p.ma_bo}\t${p.ma_tp}`;
  const n = (dupCount.get(dkey) || 0) + 1;
  dupCount.set(dkey, n);
  let ma_chi_tiet = p.ma_tp;
  if (n > 1) {
    const suf = "_" + String(n - 1);
    ma_chi_tiet = (p.ma_tp + suf).slice(0, 50);
  }
  inserts.push({
    ma_chi_tiet: truncateMa(ma_chi_tiet),
    ten_chi_tiet: p.ten,
    ten_dung_cu_le: p.ten,
    bo_dung_cu_id: bo_id,
    loai_dung_cu_id: loai_id,
    ma_loai: maLoaiResolved || null,
    so_luong: p.so_luong,
    max_suds_count: 100,
    ghi_chu: buildGhi(p),
    is_active: true,
    updated_at: iso(),
  });
}

const boIds = [...new Set([...distinctMas.map((m) => boIdByMa.get(m))])].filter(Boolean);
const CHUNK = 50;
for (let i = 0; i < boIds.length; i += CHUNK) {
  const part = boIds.slice(i, i + CHUNK);
  const { error: ed } = await supabase.from("dm_bo_dung_cu_chi_tiet").delete().in("bo_dung_cu_id", part);
  if (ed) {
    console.error("Xóa chi tiết cũ:", ed.message);
    process.exit(1);
  }
}
console.warn(`Đã xóa chi tiết của ${distinctMas.length} bộ (${boIds.length} id).`);

const BATCH = 200;
for (let i = 0; i < inserts.length; i += BATCH) {
  const chunk = inserts.slice(i, i + BATCH);
  const { error: ei } = await supabase.from("dm_bo_dung_cu_chi_tiet").insert(chunk);
  if (ei) {
    console.error(`Insert batch ${i / BATCH + 1}:`, ei.message);
    process.exit(1);
  }
}

console.log(`OK: đã chèn ${inserts.length} dòng chi tiết, liên kết ${distinctMas.length} bộ / ${new Set(loaiMas).size} loại (kể IMPORT_TP_*).`);
