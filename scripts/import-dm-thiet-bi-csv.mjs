/**
 * Import CSSD_Management — DM_ThietBi.csv → public.dm_thiet_bi (upsert ma_thiet_bi).
 * Cột CSV: MaThietBi, TenThietBi, LoaiThietBi, Serial, MoTa, NgayLapDat, MaQR, LichBaoDuong
 * loai_thiet_bi: mã dm_loai_may_tiet_khuan (map theo tên loại trong CSV).
 *
 * Chạy: node --env-file=.env.local scripts/import-dm-thiet-bi-csv.mjs [đường-dẫn.csv]
 * --strict: thoát mã 1 nếu có dòng không resolve được loại máy.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT =
  "/Users/trinhhuunghia/Music/Music_High Quality/data for app/CSSD_Management - DM_ThietBi.csv";

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

/** @param {string} s */
function vnFold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * @param {string} csvLoai
 * @param {{ ma_loai_may: string; ten_loai_may: string }[]} loaiRows
 */
function resolveLoaiMa(csvLoai, loaiRows) {
  const raw = String(csvLoai || "").trim();
  if (!raw) return { ma: null, how: "empty" };
  const n = vnFold(raw);

  for (const r of loaiRows) {
    if (vnFold(r.ten_loai_may) === n) return { ma: r.ma_loai_may, how: "exact_ten" };
  }
  for (const r of loaiRows) {
    const tn = vnFold(r.ten_loai_may);
    if (n.includes(tn) || tn.includes(n)) return { ma: r.ma_loai_may, how: "partial_ten" };
  }
  if (/hoi nuoc|steam|hap/.test(n)) {
    const hit = loaiRows.find((r) => /hoi|nuoc|hap|steam/i.test(vnFold(r.ten_loai_may)));
    if (hit) return { ma: hit.ma_loai_may, how: "keyword_steam" };
  }
  if (/\beo\b|^eto|ethylene/.test(n)) {
    const hit = loaiRows.find((r) => /eo|ethylene/i.test(vnFold(r.ten_loai_may)));
    if (hit) return { ma: hit.ma_loai_may, how: "keyword_eo" };
  }
  if (/plasma/.test(n)) {
    const hit = loaiRows.find((r) => /plasma/i.test(r.ten_loai_may));
    if (hit) return { ma: hit.ma_loai_may, how: "keyword_plasma" };
  }
  return { ma: null, how: "unresolved" };
}

/** @param {string} s */
function parseLichBaoDuong(s) {
  const t = String(s || "").trim();
  const mo = t.match(/(\d+)\s*th[aá]ng/i);
  if (mo) return Math.max(28, Math.round(Number(mo[1]) * 30.5));
  const d = t.match(/(\d+)\s*ng[aà]y/i);
  if (d) return Math.max(1, Number(d[1]));
  return 180;
}

/** @param {string} d */
function parseDateOnly(d) {
  const raw = String(d || "").trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return raw.slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/) ? raw.slice(0, 10) : dt.toISOString().slice(0, 10);
}

const strict = process.argv.includes("--strict");
const csvPath = process.argv.find((a) => a.endsWith(".csv") && fs.existsSync(a)) || CSV_DEFAULT;

if (!fs.existsSync(csvPath)) {
  console.error("Không có file CSV:", csvPath);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong môi trường.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const grid = parseCsv(fs.readFileSync(csvPath, "utf8"));
const expect = ["MaThietBi", "TenThietBi", "LoaiThietBi", "Serial", "MoTa", "NgayLapDat", "MaQR", "LichBaoDuong"];
const header = (grid[0] || []).map((h) => h.trim());
const missing = expect.filter((n, j) => header[j] !== n);
if (missing.length) {
  console.error("Header CSV không khớp. Cần:", expect.join(","), "| nhận được:", header.join(","));
  process.exit(1);
}

const ix = Object.fromEntries(expect.map((n, j) => [n, j]));

const { data: loaiPack, error: el } = await supabase
  .from("dm_loai_may_tiet_khuan")
  .select("ma_loai_may, ten_loai_may")
  .eq("is_active", true);
if (el) {
  console.error("Không đọc dm_loai_may_tiet_khuan:", el.message);
  process.exit(1);
}
const loaiRows = loaiPack || [];

const iso = () => new Date().toISOString();

/** @type {Record<string, unknown>[]} */
const rows = [];
/** @type string[] */
const warns = [];

for (let i = 1; i < grid.length; i++) {
  const cols = grid[i];
  const maRaw = String(cols[ix.MaThietBi] ?? "").trim();
  if (!maRaw) continue;
  const ma = maRaw.toUpperCase();
  const ten = String(cols[ix.TenThietBi] ?? "").trim();
  const loaiTen = String(cols[ix.LoaiThietBi] ?? "").trim();
  const serial = String(cols[ix.Serial] ?? "").trim();
  const moTa = String(cols[ix.MoTa] ?? "").trim();
  const ngay = parseDateOnly(cols[ix.NgayLapDat]);
  const maQr = String(cols[ix.MaQR] ?? "").trim();
  const lich = parseLichBaoDuong(cols[ix.LichBaoDuong]);

  if (!ten) {
    console.error(`Dòng ${i + 1}: thiếu TenThietBi cho mã ${ma}`);
    process.exit(1);
  }

  const { ma: loaiMa, how } = resolveLoaiMa(loaiTen, loaiRows);
  if (!loaiMa) {
    const msg = `Dòng ${i + 1} (${ma}): không map được LoaiThietBi="${loaiTen}" → cần bản ghi trong dm_loai_may_tiet_khuan.`;
    if (strict) {
      console.error(msg);
      process.exit(1);
    }
    warns.push(msg);
  } else if (how !== "exact_ten") {
    warns.push(`Dòng ${i + 1} (${ma}): loại CSV "${loaiTen}" → ma ${loaiMa} (${how})`);
  }

  const ghiParts = ["Nguồn import: CSSD_Management_DM_ThietBi.csv"];
  if (moTa) ghiParts.push(`Mô tả: ${moTa}`);
  if (serial) ghiParts.push(`Serial: ${serial}`);
  if (maQr) ghiParts.push(`Mã QR/URL: ${maQr}`);
  ghiParts.push(`Lịch bảo dưỡng (CSV): ${String(cols[ix.LichBaoDuong] ?? "").trim() || "—"}`);

  rows.push({
    ma_thiet_bi: ma,
    ten_thiet_bi: ten,
    loai_thiet_bi: loaiMa,
    trang_thai: "READY",
    ngay_dua_vao_su_dung: ngay || null,
    chu_ky_bao_tri_ngay: lich,
    ghi_chu: ghiParts.join("\n"),
    is_active: true,
    updated_at: iso(),
  });
}

const BATCH = 20;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("dm_thiet_bi").upsert(chunk, { onConflict: "ma_thiet_bi" });
  if (error) {
    console.error("Upsert dm_thiet_bi:", error.message);
    process.exit(1);
  }
}

console.log(`OK: đã upsert ${rows.length} thiết bị vào dm_thiet_bi (ma_thiet_bi).`);

if (warns.length) {
  console.warn("--- Cảnh báo ---");
  for (const w of warns) console.warn(w);
}
