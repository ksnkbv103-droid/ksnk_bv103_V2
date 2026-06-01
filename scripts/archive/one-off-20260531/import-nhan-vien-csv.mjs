/**
 * Import DM_NhanVien.csv vào mdm_nhan_su — chuẩn KSNK BV103:
 * - Khoa = ma_khoa trong dm_khoa_phong; nếu thiếu C19 thì tạo khối theo C18 + bản ghi cảnh báo tên gốc CSV.
 * - BoPhan -> dm_to_cong_tac (GS-CSSD/CSSD -> Tổ CSSD KSNK_Gr_1; thiếu mã -> upsert IMPORT_TO_*).
 * - NgheNghiep -> dm_nghe_nghiep (khớp lỏng; thiếu -> upsert IMPORT_NN_*).
 * - ChucVu -> dm_chuc_vu (chỉ khớp catalog hiện có; không tự tạo chức vụ lạ).
 * - Trình độ / Phân quyền CSV -> extra_data (không map RBAC Postgres).
 * - Password cột trong CSV bị bỏ qua — không đổi auth.
 *
 * Nguy hiểm: XÓA toàn bộ mdm_nhan_su hiện có (FK nghiệp vụ chủ yếu ON DELETE SET NULL).
 * Chạy: node --env-file=.env.local scripts/import-nhan-vien-csv.mjs [/path/CSSD_Management\ -\ DM_NhanVien.csv]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const CSV_DEFAULT =
  "/Users/trinhhuunghia/Music/Music_High Quality/data for app/CSSD_Management - DM_NhanVien.csv";

function parseCsvLines(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  /** @type {string[][]} */
  const rows = [];
  for (const line of lines) {
    const cols = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (!inQ && c === ",") {
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

/** Bỏ dấu để so khớp lỏng hơn */
function stripVnAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
}

/** Chuẩn hóa so khớp tên tiếng Việt tối thiểu */
function vnKey(s) {
  return stripVnAccents(String(s || ""))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[`'']/g, "")
    .trim();
}

/** Ma_to ổn định từ nhãn CSV (ASCII) */
function slugImportMa(label) {
  const a = vnKey(label).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const code = (a || "x").toUpperCase().slice(0, 48);
  return code;
}

function inferToCssdId(csvBoPhan, cssdGroupId) {
  const raw = String(csvBoPhan || "").trim();
  if (!raw || !cssdGroupId) return null;
  const k = vnKey(raw).replace(/[^a-z0-9]/g, "");
  if (k.includes("cssd")) return cssdGroupId;
  return null;
}

function activeFromTrangThai(s) {
  const k = vnKey(s);
  if (!k) return true;
  if (k.includes("nghi")) return false;
  if (k.includes("lam viec")) return true;
  return true;
}

function normalizePhone(p) {
  return String(p || "")
    .replace(/\s+/g, "")
    .trim();
}

function findKhoaId(map, maRaw) {
  const ma = String(maRaw || "").trim().toUpperCase();
  return map.get(ma) || null;
}

function findDmIdByName(rows, csvVal, getNames) {
  const key = vnKey(csvVal);
  if (!key) return null;
  let best = null;
  let bestScore = -1;
  for (const r of rows) {
    for (const n of getNames(r)) {
      const nk = vnKey(n);
      if (!nk) continue;
      if (nk === key) return r.id;
      if (nk.includes(key) || key.includes(nk)) {
        const sc = Math.min(nk.length, key.length);
        if (sc > bestScore) {
          bestScore = sc;
          best = r.id;
        }
      }
    }
  }
  return best;
}

async function ensureKhoaC19(supabase, khoaByMa) {
  if (khoaByMa.has("C19")) return khoaByMa.get("C19");

  const { data: base, error: e1 } = await supabase.from("dm_khoa_phong").select("khoi_id").eq("ma_khoa", "C18").maybeSingle();
  if (e1) throw e1;
  const khoiId = base?.khoi_id ?? null;

  const { data: inserted, error: e2 } = await supabase
    .from("dm_khoa_phong")
    .insert([
      {
        ma_khoa: "C19",
        ten_khoa: "KHOA C19 (đồng bộ DM_NhanVien — kiểm tra lại khớp BV103)",
        khoi_id: khoiId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();
  if (e2 && !String(e2.message || "").includes("duplicate")) throw e2;
  if (inserted?.id) {
    khoaByMa.set("C19", inserted.id);
    console.warn("Đã auto-thêm dm_khoa_phong.ma_khoa=C19 — vui lòng đổi tên trong Quản trị nếu cần.");
    return inserted.id;
  }
  const again = await supabase.from("dm_khoa_phong").select("id").eq("ma_khoa", "C19").maybeSingle();
  if (again.data?.id) {
    khoaByMa.set("C19", again.data.id);
    return again.data.id;
  }
  return null;
}

/**
 * @param {string} csvBoPhan
 * @param {{ id: string, ma_to: string, ten_to: string }[] | null | undefined} rows
 * @param {string | null | undefined} cssdGroupId  — thường là KSNK_Gr_1 (Tổ CSSD)
 */
function findToMatch(csvBoPhan, rows, cssdGroupId) {
  const cssd = inferToCssdId(csvBoPhan, cssdGroupId);
  if (cssd) return cssd;
  const key = vnKey(csvBoPhan);
  if (!key) return null;
  for (const r of rows || []) {
    const ma = vnKey(r.ma_to);
    const ten = vnKey(r.ten_to);
    if (ma === key || ten === key) return r.id;
  }
  for (const r of rows || []) {
    const ma = vnKey(r.ma_to);
    const ten = vnKey(r.ten_to);
    if (ten.includes(key) || key.includes(ten)) return r.id;
    if (ma.includes(key) || key.includes(ma)) return r.id;
  }
  return null;
}

/**
 * Bổ sung dm_to_cong_tac cho nhãn CSV chưa có (GS-CSSD/CSSD đã map sang Tổ CSSD).
 */
async function ensureToCongTacFromCsv(supabase, boPhanVals, toRows) {
  const rows = toRows || [];
  const cssdId = rows.find((r) => r.ma_to === "KSNK_Gr_1")?.id ?? null;
  /** @type {Set<string>} */
  const seenMa = new Set();
  /** @type {Record<string, unknown>[]} */
  const toUpsert = [];
  for (const raw of boPhanVals) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    if (findToMatch(trimmed, rows, cssdId)) continue;
    const ma = `IMPORT_TO_${slugImportMa(trimmed)}`;
    if (seenMa.has(ma)) continue;
    seenMa.add(ma);
    toUpsert.push({
      ma_to: ma,
      ten_to: trimmed,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }
  if (!toUpsert.length) return;
  const { error } = await supabase.from("dm_to_cong_tac").upsert(toUpsert, { onConflict: "ma_to" });
  if (error) throw error;
  console.warn("Đã bổ sung dm_to_cong_tac:", toUpsert.map((x) => x.ma_to).join(", "));
}

/**
 * Bổ sung dm_nghe_nghiep cho nhãn CSV chưa khớp (giữ đúng chữ CSV làm ten_nghe_nghiep).
 */
async function ensureNgheNghiepFromCsv(supabase, ngheVals, nnRows) {
  const rows = nnRows || [];
  /** @type {Set<string>} */
  const seenMa = new Set();
  /** @type {Record<string, unknown>[]} */
  const toUpsert = [];
  for (const raw of ngheVals) {
    const t = String(raw || "").trim();
    if (!t) continue;
    if (findDmIdByName(rows, t, (r) => [r.ten_nghe_nghiep, r.ma_nghe_nghiep])) continue;
    const ma = `IMPORT_NN_${slugImportMa(t)}`;
    if (seenMa.has(ma)) continue;
    seenMa.add(ma);
    toUpsert.push({
      ma_nghe_nghiep: ma,
      ten_nghe_nghiep: t,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }
  if (!toUpsert.length) return;
  const { error } = await supabase.from("dm_nghe_nghiep").upsert(toUpsert, { onConflict: "ma_nghe_nghiep" });
  if (error) throw error;
  console.warn("Đã bổ sung dm_nghe_nghiep:", toUpsert.map((x) => x.ma_nghe_nghiep).join(", "));
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
const grid = parseCsvLines(raw);
if (grid.length < 2) {
  console.error("CSV không có dữ liệu");
  process.exit(1);
}

const header = grid[0].map((h) => h.trim());
const ix = Object.fromEntries(header.map((h, i) => [h, i]));

const [{ data: khoas, error: eK }] = await Promise.all([
  supabase.from("dm_khoa_phong").select("id,ma_khoa"),
]);
if (eK) throw eK;
const khoaByMa = new Map((khoas || []).map((k) => [String(k.ma_khoa).trim().toUpperCase(), k.id]));

await ensureKhoaC19(supabase, khoaByMa);

let { data: toRows } = await supabase.from("dm_to_cong_tac").select("id,ma_to,ten_to").eq("is_active", true);
const { data: cvRows } = await supabase.from("dm_chuc_vu").select("id,ma_chuc_vu,ten_chuc_vu").eq("is_active", true);
let { data: nnRows } = await supabase.from("dm_nghe_nghiep").select("id,ma_nghe_nghiep,ten_nghe_nghiep").eq("is_active", true);

/** @type {string[]} */
const uniqueBoPhan = [];
/** @type {string[]} */
const uniqueNghe = [];
/** @type {Map<string, true>} */
const seenBp = new Map();
/** @type {Map<string, true>} */
const seenNg = new Map();

/** @type {{ line: number, ma_nv: string, ho_ten: string, khoa_ma: string, email: string | null, nghe_nn: string, trinhDo: string, boPhan: string, chucVu: string, phanQuyen: string, sdt: string, trangThai: string, khoa_id: string }[]} */
const parsedOk = [];

for (let r = 1; r < grid.length; r++) {
  const row = grid[r];
  const ma_nv = String(row[ix.MaNhanVien] || "").trim();
  const ho_ten = String(row[ix.TenNhanVien] || "").trim();
  const khoa_ma = String(row[ix.Khoa] || "").trim().toUpperCase();
  const email = String(row[ix.Email] || "").trim() || null;
  const nghe_nn = row[ix.NgheNghiep] || "";
  const trinhDo = row[ix.TrinhDo] || "";
  const boPhan = row[ix.BoPhan] || "";
  const chucVu = row[ix.ChucVu] || "";
  const phanQuyen = row[ix.PhanQuyen] || "";
  const sdt = normalizePhone(row[ix.SoDienThoai] || "");
  const trangThai = row[ix.TrangThai] || "";

  if (!ma_nv || !ho_ten) continue;

  const khoa_id = findKhoaId(khoaByMa, khoa_ma);
  if (!khoa_id) {
    console.error(`Dòng ${r + 1}: không tìm thấy dm_khoa_phong.ma_khoa="${khoa_ma}" (${ma_nv})`);
    process.exit(1);
  }

  const bp = String(boPhan || "").trim();
  if (bp && !seenBp.has(bp)) {
    seenBp.set(bp, true);
    uniqueBoPhan.push(bp);
  }
  const nn = String(nghe_nn || "").trim();
  if (nn && !seenNg.has(nn)) {
    seenNg.set(nn, true);
    uniqueNghe.push(nn);
  }

  parsedOk.push({
    line: r + 1,
    ma_nv,
    ho_ten,
    khoa_ma,
    email,
    nghe_nn,
    trinhDo,
    boPhan,
    chucVu,
    phanQuyen,
    sdt,
    trangThai,
    khoa_id,
  });
}

await ensureToCongTacFromCsv(supabase, uniqueBoPhan, toRows);
await ensureNgheNghiepFromCsv(supabase, uniqueNghe, nnRows);

({ data: toRows } = await supabase.from("dm_to_cong_tac").select("id,ma_to,ten_to").eq("is_active", true));
({ data: nnRows } = await supabase.from("dm_nghe_nghiep").select("id,ma_nghe_nghiep,ten_nghe_nghiep").eq("is_active", true));

const cssdGroupId = (toRows || []).find((x) => x.ma_to === "KSNK_Gr_1")?.id ?? null;

function findCvId(csvChucVu) {
  return findDmIdByName(cvRows || [], csvChucVu, (r) => [r.ten_chuc_vu, r.ma_chuc_vu]);
}

function findNnId(csvNn) {
  return findDmIdByName(nnRows || [], csvNn, (r) => [r.ten_nghe_nghiep, r.ma_nghe_nghiep]);
}

/** @type {{ ma_nv:string, ho_ten:string, payload: Record<string, unknown> }[]} */
const toInsert = [];

for (const p of parsedOk) {
  const { ma_nv, ho_ten, khoa_id, email, nghe_nn, trinhDo, boPhan, chucVu, phanQuyen, sdt, trangThai } = p;

  const to_id = findToMatch(boPhan, toRows || [], cssdGroupId);
  const chuc_vu_id = findCvId(chucVu);
  const nghe_nghiep_id = findNnId(nghe_nn);

  /** @type Record<string, unknown> */
  const payload = {
    ma_nv,
    ho_ten,
    email,
    so_dien_thoai: sdt || null,
    khoa_id,
    to_id,
    chuc_vu_id,
    chuc_vu: chucVu ? String(chucVu).trim() : null,
    chuc_danh_id: null,
    chuc_danh: null,
    vai_tro_he_thong_id: null,
    vai_tro_he_thong_ksnk: null,
    is_active: activeFromTrangThai(trangThai),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    extra_data: {
      csv_trinh_do: String(trinhDo || "").trim() || null,
      csv_bo_phan: String(boPhan || "").trim() || null,
      csv_chuc_vu: String(chucVu || "").trim() || null,
      csv_nghe_nghiep: String(nghe_nn || "").trim() || null,
      csv_phan_quyen_legacy: String(phanQuyen || "").trim() || null,
      import_source: "CSSD_Management_DMNhanVien_CSV",
      import_at: new Date().toISOString(),
      matched_to_id: to_id,
      matched_chuc_vu_id: chuc_vu_id,
      matched_nghe_nghiep_id: nghe_nghiep_id,
    },
  };

  toInsert.push({ ma_nv, ho_ten, payload });
}

if (!toInsert.length) {
  console.error("Không có dòng hợp lệ để nhập.");
  process.exit(1);
}

const { error: delErr } = await supabase
  .from("mdm_nhan_su")
  .delete()
  .lte("created_at", new Date(Date.now() + 86400000).toISOString());
if (delErr) {
  console.error("Xóa nhân viên cũ thất bại:", delErr.message);
  process.exit(1);
}
console.log("Đã xóa toàn bộ hàng mdm_nhan_su.");

const BATCH = 20;
for (let i = 0; i < toInsert.length; i += BATCH) {
  const batch = toInsert.slice(i, i + BATCH).map((x) => x.payload);
  const { error: insErr } = await supabase.from("mdm_nhan_su").insert(batch);
  if (insErr) {
    console.error(`Lỗi insert batch ${i / BATCH + 1}:`, insErr.message);
    process.exit(1);
  }
}

console.log(`OK: đã chèn ${toInsert.length} hồ sơ nhân viên.`);

const warnTo = toInsert.filter((x) => !x.payload.to_id && String(x.payload.extra_data.csv_bo_phan || "").trim());
const warnNn = toInsert.filter(
  (x) => !x.payload.extra_data?.matched_nghe_nghiep_id && String(x.payload.extra_data?.csv_nghe_nghiep || "").trim(),
);
if (warnTo.length)
  console.warn(
    `"Tổ" chưa match dm_to_cong_tac (${warnTo.length} dòng — xem csv_bo_phan trong extra_data):`,
    [...new Set(warnTo.slice(0, 8).map((w) => w.payload.extra_data.csv_bo_phan))].join("; "),
  );
if (warnNn.length)
  console.warn(`Nghề chưa match dm_nghe_nghiep: ${warnNn.length} dòng.`);
