/**
 * Import quy định ap_dung_jsonb từ CSV do KSNK duyệt.
 * Mẫu cột: docs/data/bang-kiem/ap-dung-mapping-template.csv
 *
 * Không đoán phạm vi — chỉ cập nhật dòng có trong file.
 * Chạy: node --env-file=.env.local scripts/import-bang-kiem-ap-dung-csv.mjs [path.csv]
 * Dry-run: DRY_RUN=1 node --env-file=.env.local scripts/import-bang-kiem-ap-dung-csv.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const CSV_DEFAULT = path.join(process.cwd(), "docs/data/bang-kiem/ap-dung-mapping-template.csv");

function parseCsvLine(line) {
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
  return cols;
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return Object.fromEntries(header.map((h, i) => [h, cols[i] ?? ""]));
  });
  return { header, rows };
}

function parseBool(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "có";
}

const PHAM_VI = new Set(["CA_VIEN", "THEO_KHOI", "THEO_KHOA", "CHI_KSNK", "KHUYEN_NGH"]);
const MUC_DO = new Set(["BAT_BUOC", "KHUYEN_NGH", "CHI_KSNK"]);
const TAN_SUAT_DON_VI = new Set(["TUAN", "THANG", "QUY"]);

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

const dryRun = process.env.DRY_RUN === "1";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { rows } = parseCsv(fs.readFileSync(csvPath, "utf8"));
if (rows.length === 0) {
  console.error("CSV không có dòng dữ liệu");
  process.exit(1);
}

const [{ data: khoaRows }, { data: khoiRows }, { data: bkRows }] = await Promise.all([
  supabase.from("mdm_dm_khoa_phong").select("id, ma_khoa").eq("is_active", true),
  supabase.from("mdm_dm_khoi_khoa").select("id, ma_khoi").eq("is_active", true),
  supabase.from("gstt_dm_bang_kiem").select("id, ma_bk, ap_dung_jsonb"),
]);

const khoaByMa = new Map(
  (khoaRows ?? []).map((k) => [String(k.ma_khoa ?? "").trim().toUpperCase(), String(k.id)]),
);
const khoiByMa = new Map(
  (khoiRows ?? []).map((k) => [String(k.ma_khoi ?? "").trim().toUpperCase(), String(k.id)]),
);
const bkByMa = new Map((bkRows ?? []).map((b) => [String(b.ma_bk ?? "").trim(), b]));

let ok = 0;
let skip = 0;
const errors = [];

for (const row of rows) {
  const ma_bk = String(row.ma_bk ?? "").trim();
  if (!ma_bk) {
    skip++;
    continue;
  }
  const bk = bkByMa.get(ma_bk);
  if (!bk) {
    errors.push(`${ma_bk}: không tìm thấy trong gstt_dm_bang_kiem`);
    continue;
  }

  const pham_vi = String(row.pham_vi ?? "").trim().toUpperCase();
  if (!PHAM_VI.has(pham_vi)) {
    errors.push(`${ma_bk}: pham_vi không hợp lệ (${row.pham_vi})`);
    continue;
  }

  const muc_do = String(row.muc_do ?? "BAT_BUOC").trim().toUpperCase();
  if (!MUC_DO.has(muc_do)) {
    errors.push(`${ma_bk}: muc_do không hợp lệ (${row.muc_do})`);
    continue;
  }

  const khoiMa = String(row.khoi_ma ?? "").trim();
  const khoaMa = String(row.khoa_ma ?? "").trim();
  const khoi_ids = khoiMa
    ? khoiMa
        .split(/[;|]/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .map((ma) => khoiByMa.get(ma))
        .filter(Boolean)
    : [];
  const khoa_ids = khoaMa
    ? khoaMa
        .split(/[;|]/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .map((ma) => khoaByMa.get(ma))
        .filter(Boolean)
    : [];

  if (pham_vi === "THEO_KHOI" && khoi_ids.length === 0) {
    errors.push(`${ma_bk}: THEO_KHOI nhưng không resolve được khoi_ma (${khoiMa})`);
    continue;
  }
  if (pham_vi === "THEO_KHOA" && khoa_ids.length === 0) {
    errors.push(`${ma_bk}: THEO_KHOA nhưng không resolve được khoa_ma (${khoaMa})`);
    continue;
  }

  const ap = {
    pham_vi,
    khoi_ids,
    khoa_ids,
    khoa_loai_tru: [],
    bat_buoc: {
      tu_giam_sat: parseBool(row.bat_buoc_tgs),
      ksnk_giam_sat: parseBool(row.bat_buoc_ksnk),
    },
    muc_do,
    ghi_chu: String(row.ghi_chu ?? "").trim() || undefined,
  };

  const tanDonVi = String(row.tan_suat_don_vi ?? "").trim().toUpperCase();
  const tanSoLan = Number(row.tan_suat_so_lan);
  if (tanDonVi && TAN_SUAT_DON_VI.has(tanDonVi) && Number.isFinite(tanSoLan) && tanSoLan >= 1) {
    ap.tan_suat_toi_thieu = { don_vi: tanDonVi, so_lan: Math.floor(tanSoLan) };
  }

  if (dryRun) {
    console.log(`[dry-run] ${ma_bk}`, JSON.stringify(ap));
    ok++;
    continue;
  }

  const { error } = await supabase
    .from("gstt_dm_bang_kiem")
    .update({ ap_dung_jsonb: ap, updated_at: new Date().toISOString() })
    .eq("id", bk.id);
  if (error) {
    errors.push(`${ma_bk}: ${error.message}`);
    continue;
  }
  ok++;
  console.log(`OK ${ma_bk}`);
}

console.log(`\nHoàn tất: ${ok} cập nhật, ${skip} bỏ qua, ${errors.length} lỗi${dryRun ? " (dry-run)" : ""}.`);
if (errors.length) {
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
