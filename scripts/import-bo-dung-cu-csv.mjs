/**
 * Import CSSD_Management - DM_BoDungCu.csv → public.dm_bo_dung_cu (upsert ma_bo).
 * Map: PhanLoai → dm_loai_dung_cu(ma_loai), KhoaPhongSuDung → dm_khoa_phong(ma_khoa).
 * CSV thừa → ghi_chu; không wipe toàn bảng (tránh vỡ FK quy_trinh).
 * Chạy: node --env-file=.env.local scripts/import-bo-dung-cu-csv.mjs [/path/file.csv]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT =
  "/Users/trinhhuunghia/Music/Music_High Quality/data for app/CSSD_Management - DM_BoDungCu.csv";

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

function normalizeTenBo(t) {
  return String(t || "")
    .trim()
    .replace(/^"|"$/g, "");
}

function buildGhiChu(o) {
  const lines = ["Nguồn import: CSSD_Management_DM_BoDungCu.csv"];
  if (o.ma_bo_goc && o.ma_bo_goc !== o.ma_bo) lines.push(`Mã gốc CSV: ${o.ma_bo_goc}`);
  /** @type {string[]} */
  const m = [];
  if (o.tong_sl) m.push(`Tổng SL dụng cụ: ${o.tong_sl}`);
  if (o.so_ck !== "") m.push(`Số chu kỳ xử lý: ${o.so_ck}`);
  if (o.nguoi_ql) m.push(`Người QL (CSV): ${o.nguoi_ql}`);
  if (o.nuoc_sx) m.push(`Nước SX: ${o.nuoc_sx}`);
  if (o.nam_sx) m.push(`Năm SX: ${o.nam_sx}`);
  if (o.nam_bdsd) m.push(`Năm BDSD: ${o.nam_bdsd}`);
  if (o.tinh_trang) m.push(`Tình trạng (CSV): ${o.tinh_trang}`);
  if (o.ma_qr) m.push(`QR URL: ${o.ma_qr}`);
  if (m.length) lines.push(m.join(" | "));
  return lines.join("\n");
}

function sanitizeTrangThai(s) {
  const t = String(s || "").trim();
  if (!t) return "ACTIVE";
  const u = t.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 50);
  return u || "ACTIVE";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Map<string,string>} existingLoaiMaToId
 * @param {string[]} mais
 */
async function ensureLoaiDungCu(supabase, existingLoaiMaToId, mais) {
  const missing = [...new Set(mais.map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))].filter((m) => !existingLoaiMaToId.has(m));
  if (!missing.length) return;
  const iso = () => new Date().toISOString();
  /** @type {Record<string, unknown>[]} */
  const rows = missing.map((ma) => ({
    ma_loai: ma,
    ten_loai: `Phân loại ${ma} (import CSV BV103)`,
    is_active: true,
    created_at: iso(),
    updated_at: iso(),
  }));
  const { error } = await supabase.from("dm_loai_dung_cu").upsert(rows, { onConflict: "ma_loai" });
  if (error) throw error;
  const { data } = await supabase.from("dm_loai_dung_cu").select("id,ma_loai").in("ma_loai", missing);
  for (const r of data || []) existingLoaiMaToId.set(String(r.ma_loai).toUpperCase(), r.id);
  console.warn("Đã upsert dm_loai_dung_cu:", missing.join(", "));
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
const expect = ["MaBo", "TenBo", "MaBo_Goc", "PhanLoai", "KhoaPhongSuDung", "TongSoLuongDC", "DG_QuyCach", "SoChuKyXuLy", "NguoiQuanLy", "NuocSX", "NamSX", "NamBDSD", "TinhTrangSuDung", "MaQR_BoDungCu"];
if (header[0] !== "MaBo" || (grid[1] && grid[1].length !== expect.length)) {
  console.error("Định dạng DM_BoDungCu.csv không khớp (đủ 14 cột). Header:", header.join("|"));
  process.exit(1);
}

const ix = {};
expect.forEach((name, j) => {
  ix[name] = j;
});

async function ensureKhoaChung(supabase, khoaByMa) {
  if (khoaByMa.has("CHUNG")) return;
  const { data: anyK } = await supabase.from("dm_khoa_phong").select("khoi_id").limit(1).maybeSingle();
  const khoi_id = anyK?.khoi_id ?? null;
  const patch = {
    ma_khoa: "CHUNG",
    ten_khoa: "Chung / bổ sung (import DM_BoDungCu — chỉnh trong Quản trị)",
    khoi_id,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const { data: ins, error } = await supabase.from("dm_khoa_phong").insert([patch]).select("id").maybeSingle();
  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) throw error;
  if (ins?.id) {
    khoaByMa.set("CHUNG", ins.id);
    console.warn("Đã thêm dm_khoa_phong.ma_khoa=CHUNG — kiểm tra tên khoa trong Quản trị.");
    return;
  }
  const { data: again } = await supabase.from("dm_khoa_phong").select("id").eq("ma_khoa", "CHUNG").maybeSingle();
  if (again?.id) khoaByMa.set("CHUNG", again.id);
}

const { data: khoas, error: ek } = await supabase.from("dm_khoa_phong").select("id,ma_khoa").eq("is_active", true);
if (ek) throw ek;
const khoaByMa = new Map((khoas || []).map((k) => [String(k.ma_khoa).trim().toUpperCase(), k.id]));
await ensureKhoaChung(supabase, khoaByMa);

let { data: loaiRows, error: el } = await supabase.from("dm_loai_dung_cu").select("id,ma_loai").eq("is_active", true);
if (el) throw el;
const loaiMaToId = new Map((loaiRows || []).map((x) => [String(x.ma_loai).trim().toUpperCase(), x.id]));

/** @type {Record<string, unknown>[]} */
const payloads = [];

for (let r = 1; r < grid.length; r++) {
  const row = grid[r];
  if (row.length < 14) {
    console.error(`Dòng ${r + 1}: chỉ có ${row.length} cột`, row[0]);
    process.exit(1);
  }
  const ma_bo = String(row[ix.MaBo] ?? "").trim();
  const ten_bo = normalizeTenBo(row[ix.TenBo] ?? "");
  const ma_bo_goc = String(row[ix.MaBo_Goc] ?? "").trim();
  const phanLoai = String(row[ix.PhanLoai] ?? "").trim().toUpperCase();
  const khoaMa = String(row[ix.KhoaPhongSuDung] ?? "").trim().toUpperCase();
  const tong_sl = String(row[ix.TongSoLuongDC] ?? "").trim();
  const quy_cach = String(row[ix.DG_QuyCach] ?? "").trim() || null;
  const so_ck = String(row[ix.SoChuKyXuLy] ?? "").trim();
  const nguoi_ql = String(row[ix.NguoiQuanLy] ?? "").trim();
  const nuoc_sx = String(row[ix.NuocSX] ?? "").trim();
  const nam_sx = String(row[ix.NamSX] ?? "").trim();
  const nam_bdsd = String(row[ix.NamBDSD] ?? "").trim();
  const tinh_trang = String(row[ix.TinhTrangSuDung] ?? "").trim();
  const ma_qr = String(row[ix.MaQR_BoDungCu] ?? "").trim();

  if (!ma_bo || !ten_bo) {
    console.error(`Dòng ${r + 1}: thiếu MaBo hoặc TenBo`);
    process.exit(1);
  }

  payloads.push({
    ma_bo,
    ten_bo,
    loai_ma: phanLoai || "UNKNOWN",
    khoa_su_dung_id: khoaMa ? khoaByMa.get(khoaMa) ?? null : null,
    quy_cach,
    trang_thai: sanitizeTrangThai(tinh_trang),
    ghi_chu: buildGhiChu({
      ma_bo,
      ma_bo_goc,
      tong_sl,
      so_ck,
      nguoi_ql,
      nuoc_sx,
      nam_sx,
      nam_bdsd,
      tinh_trang,
      ma_qr,
    }),
    is_active: true,
    meta_khoa: khoaMa || null,
  });
}

await ensureLoaiDungCu(
  supabase,
  loaiMaToId,
  payloads.map((p) => p.loai_ma),
);

const iso = () => new Date().toISOString();
/** @type {Record<string, unknown>[]} */
const rows = [];

/** @type {string[]} */
const warnKhoa = [];

for (const p of payloads) {
  const loaiId = loaiMaToId.get(String(p.loai_ma).trim().toUpperCase());
  if (!loaiId) {
    console.error("Không resolve loai:", p.ma_bo, p.loai_ma);
    process.exit(1);
  }
  if (p.meta_khoa && !p.khoa_su_dung_id && p.meta_khoa !== "") warnKhoa.push(`${p.ma_bo} → ${p.meta_khoa}`);

  rows.push({
    ma_bo: p.ma_bo,
    ten_bo: p.ten_bo,
    loai_dung_cu_id: loaiId,
    khoa_su_dung_id: p.khoa_su_dung_id,
    quy_cach: p.quy_cach,
    trang_thai: p.trang_thai,
    ghi_chu: p.ghi_chu,
    is_active: p.is_active,
    updated_at: iso(),
  });
}

const BATCH = 25;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("dm_bo_dung_cu").upsert(chunk, { onConflict: "ma_bo" });
  if (error) {
    console.error("Upsert dm_bo_dung_cu:", error.message);
    process.exit(1);
  }
}

console.log(`OK: đã upsert ${rows.length} bộ dụng cụ (ma_bo).`);

if (warnKhoa.length)
  console.warn(
    `${warnKhoa.length} dòng không tìm thấy dm_khoa_phong.ma_khoa khớp (khoa_su_dung_id = NULL):`,
    warnKhoa.slice(0, 12).join("; ") + (warnKhoa.length > 12 ? "; …" : ""),
  );
