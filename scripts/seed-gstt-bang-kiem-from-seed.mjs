/**
 * Soft Soft Soft-local — GSC-L03 seed gstt_dm_bang_kiem từ bang-kiem-seed (25d Domain A).
 *
 * DoD: chỉ IN-SCOPE; 0 OUT; không invent tiêu chí lâm sàng; không seed WHO vào picker GSC.
 *
 * Default: DRY_RUN=1 (không ghi DB). Apply Soft Soft Soft-local only:
 *   APPLY=1 node --env-file=.env.local scripts/seed-gstt-bang-kiem-from-seed.mjs
 *
 * KHÔNG chạy prod migrate từ script này. KHÔNG commit bắt buộc.
 *
 * Counts expected: catalog 66 = 1 WHO (VST module, skip gstt) + 65 BK → gstt.
 * ma_bk: full KSNK.QT|QĐ.*.BM.* (gap 03: không dùng short làm PK mới).
 * Alias short (BM.07.02…) ghi trong ap_dung_jsonb.seed_meta khi có trong gap xref.
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_DIR = path.join(ROOT, "docs/modules/giam-sat/bang-kiem-seed");
const CATALOG_PATH = path.join(SEED_DIR, "00-catalog.json");
const BK_DIR = path.join(SEED_DIR, "bk");
const WHO_DIR = path.join(SEED_DIR, "who");
const EXCLUDED_PATH = path.join(SEED_DIR, "01-excluded-index.md");
const GAP_PATH = path.join(SEED_DIR, "03-gap-vs-canonical36.md");

const APPLY = String(process.env.APPLY || "").trim() === "1";
const DRY_RUN = !APPLY;

const WHO_MA = new Set([
  "KSNK.QT.07.BM.01",
  "BM.07.01",
  "VST_WHO",
]);

/** Known short aliases tip VST / canonical-36 (Soft Soft Soft-safe xref only — no invent). */
const SHORT_ALIAS = {
  "KSNK.QT.07.BM.02": "BM.07.02",
  "KSNK.QT.07.BM.03": "BM.07.03",
  "KSNK.QT.03.BM.03": "BM.03.03",
  "KSNK.QT.08.BM.01": "BM.08.01",
  "KSNK.QT.09.BM.01": "BM.09.01",
  "KSNK.QT.12.BM.01": "BM.12.01",
  "KSNK.QT.14.BM.01": "BM.14.01",
  "KSNK.QT.15.BM.01": "BM.15.01",
  "KSNK.QT.16.BM.01": "BM.16.01",
  "KSNK.QT.17.BM.01": "BM.17.01",
  "KSNK.QT.18.BM.02": "BM.18.02",
  "KSNK.QT.19.BM.02": "BM.19.02",
};

function mapCachTinhDiem(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "TY_LE" || s === "TRON_GOI" || s === "DAT_KHONG_DAT" || s === "NHAT_KY") return s;
  // Domain DAT_TREN_AP_DUNG = % đạt / tiêu chí áp dụng → TY_LE
  if (s === "DAT_TREN_AP_DUNG") return "TY_LE";
  return "TY_LE";
}

function mapPhamViLoai(loai, lop) {
  if (lop === "he_thong") return "CHI_KSNK";
  switch (String(loai || "").toLowerCase()) {
    case "toan_vien":
      return "CA_VIEN";
    case "nhom_khoa":
      return "THEO_KHOI";
    case "chuyen_khoa":
    case "don_vi_cu_the":
      return "THEO_KHOA";
    default:
      return "KHUYEN_NGH";
  }
}

function buildApDung(bk, catalogRow) {
  const pham = bk.pham_vi_khoa || catalogRow?.pham_vi_khoa || {};
  const lop = bk.lop_giam_sat || catalogRow?.lop_giam_sat || null;
  const pham_vi = mapPhamViLoai(pham.loai, lop);
  return {
    pham_vi,
    khoi_ids: [],
    khoa_ids: [],
    khoa_loai_tru: [],
    bat_buoc: {
      tu_giam_sat: false,
      ksnk_giam_sat: lop === "he_thong" || Boolean(bk.bat_buoc_filter_khoa),
    },
    muc_do: lop === "he_thong" ? "CHI_KSNK" : "KHUYEN_NGH",
    ghi_chu: String(pham.ghi_chu || bk.ghi_chu || "").slice(0, 500) || undefined,
    seed_meta: {
      ma_qt_bm: bk.ma || catalogRow?.ma_qt_bm,
      ma_bk_short: SHORT_ALIAS[bk.ma || ""] || null,
      lop_giam_sat: lop,
      pham_vi_khoa: pham,
      doi_tuong_goi_y: bk.doi_tuong_goi_y || catalogRow?.doi_tuong_goi_y || [],
      bat_buoc_filter_khoa: Boolean(bk.bat_buoc_filter_khoa ?? catalogRow?.bat_buoc_filter_khoa),
      co_quan_chu_tri: bk.co_quan_chu_tri || catalogRow?.co_quan_chu_tri || null,
      noi_quan_sat: bk.noi_quan_sat || catalogRow?.noi_quan_sat || null,
      chuyen_de: bk.chuyen_de || catalogRow?.chuyen_de || null,
      ho_form: bk.ho_form || catalogRow?.ho_form || "BK",
      source: "bang-kiem-seed",
      seed_date: "2026-09-28",
    },
  };
}

function mapTieuChi(bk) {
  const lua = Array.isArray(bk.lua_chon) ? bk.lua_chon : ["DAT", "KHONG_DAT", "KHONG_AP_DUNG"];
  const list = Array.isArray(bk.tieu_chi) ? bk.tieu_chi : [];
  return list.map((tc, i) => {
    const stt = Number(tc.stt) || i + 1;
    const ma = String(tc.ma || `TC${String(stt).padStart(2, "0")}`).trim();
    return {
      id: crypto.randomUUID(),
      stt,
      ma_tc: ma,
      noi_dung: String(tc.noi_dung || "").trim(),
      is_active: true,
      cho_phep_kpa: lua.includes("KHONG_AP_DUNG"),
      cac_lua_chon: lua,
      la_then_chot: Boolean(tc.bat_buoc),
      weight_type: "NORMAL",
    };
  });
}

function loadCatalog() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (!Array.isArray(catalog) || catalog.length !== 66) {
    throw new Error(`Catalog must be 66 IN-SCOPE, got ${catalog?.length}`);
  }
  return catalog;
}

function assertZeroOut() {
  const md = fs.readFileSync(EXCLUDED_PATH, "utf8");
  // Soft Soft Soft-safe: excluded index is documentation only — never insert those mã.
  const outMas = [...md.matchAll(/`?(KSNK\.(?:QT|QĐ)\.[0-9]+\.BM\.[0-9]+)`?/g)].map((m) => m[1]);
  return new Set(outMas);
}

function buildRows(catalog) {
  const byMa = new Map(catalog.map((c) => [c.ma_qt_bm, c]));
  const outExcluded = assertZeroOut();
  const rows = [];
  const skippedWho = [];
  const missingBk = [];

  for (const c of catalog) {
    const ma = String(c.ma_qt_bm || "").trim();
    if (!ma) continue;
    if (outExcluded.has(ma)) {
      throw new Error(`IN-SCOPE catalog mã also in OUT excluded: ${ma}`);
    }
    if (WHO_MA.has(ma) || c.ho_form === "WHO") {
      skippedWho.push(ma);
      continue;
    }
    const bkPath = path.join(BK_DIR, `${ma}.json`);
    if (!fs.existsSync(bkPath)) {
      missingBk.push(ma);
      continue;
    }
    const bk = JSON.parse(fs.readFileSync(bkPath, "utf8"));
    if (String(bk.ma || ma) !== ma) {
      throw new Error(`BK file ma mismatch: ${bkPath} vs ${ma}`);
    }
    const tieu_chi_jsonb = mapTieuChi(bk);
    if (!tieu_chi_jsonb.length) {
      throw new Error(`Empty tieu_chi for ${ma} — refuse invent`);
    }
    const lop = bk.lop_giam_sat || c.lop_giam_sat || null;
    // Soft Soft Soft-safe 16 §6: he_thong → DANH_GIA_HE_THONG (picker hệ thống ≠ thực hành)
    const loaiFromLop =
      lop === "he_thong"
        ? "DANH_GIA_HE_THONG"
        : String(bk.loai_giam_sat || c.loai_giam_sat_de_xuat || "TUAN_THU");
    rows.push({
      ma_bk: ma,
      ten_bang_kiem: String(bk.ten || c.ten || ma).trim(),
      mo_ta: String(bk.ghi_chu || c.ghi_chu || "").slice(0, 2000) || null,
      is_active: true,
      is_system: false,
      loai_hinh_giam_sat: "TRUC_TIEP",
      tieu_chi_jsonb,
      loai_giam_sat: loaiFromLop,
      cach_tinh_diem: mapCachTinhDiem(bk.cach_tinh_diem),
      doi_tuong_giam_sat: "NHAN_VIEN",
      phien_ban: "seed-25d-20260928",
      ap_dung_jsonb: buildApDung(bk, c),
    });
  }

  return { rows, skippedWho, missingBk, catalogCount: catalog.length };
}

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error("Missing seed catalog:", CATALOG_PATH);
    process.exit(1);
  }
  const whoFiles = fs.existsSync(WHO_DIR) ? fs.readdirSync(WHO_DIR).filter((f) => f.endsWith(".json")) : [];
  const bkFiles = fs.readdirSync(BK_DIR).filter((f) => f.endsWith(".json"));
  console.log("=== Soft Soft Soft-local GSC-L03 seed ===");
  console.log("SEED_DIR", SEED_DIR);
  console.log("files: catalog + bk=%d who=%d gap=%s", bkFiles.length, whoFiles.length, fs.existsSync(GAP_PATH));
  console.log("mode:", DRY_RUN ? "DRY_RUN (no DB write)" : "APPLY=1 (upsert Soft Soft Soft-local)");

  const catalog = loadCatalog();
  const { rows, skippedWho, missingBk, catalogCount } = buildRows(catalog);

  console.log("catalog IN-SCOPE:", catalogCount);
  console.log("WHO skip (VST module, not gstt picker):", skippedWho.length, skippedWho);
  console.log("BK rows ready for gstt_dm_bang_kiem:", rows.length);
  if (missingBk.length) {
    console.error("Missing BK json:", missingBk);
    process.exit(1);
  }
  if (rows.length !== 65) {
    console.error(`Expected 65 BK inserts, got ${rows.length}`);
    process.exit(1);
  }
  if (skippedWho.length !== 1) {
    console.warn("Expected exactly 1 WHO skip; got", skippedWho.length);
  }

  const lopCounts = {};
  for (const r of rows) {
    const lop = r.ap_dung_jsonb?.seed_meta?.lop_giam_sat || "?";
    lopCounts[lop] = (lopCounts[lop] || 0) + 1;
  }
  console.log("lop_giam_sat (BK):", lopCounts);
  console.log("sample ma_bk:", rows.slice(0, 3).map((r) => r.ma_bk).join(", "), "…");

  if (DRY_RUN) {
    console.log("\nDRY_RUN OK — no DB write. Soft Soft Soft-safe load path:");
    console.log("  APPLY=1 node --env-file=.env.local scripts/seed-gstt-bang-kiem-from-seed.mjs");
    console.log("UAT after apply: SELECT count(*) FROM gstt_dm_bang_kiem WHERE phien_ban='seed-25d-20260928';");
    console.log("  expect 65 BK; picker filters WHO; Nội A must not show QT.02/05/QĐ.01 he_thong as thuc_hanh list.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE URL / service role key");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let upserted = 0;
  for (const row of rows) {
    const { data: existing, error: findErr } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("id, ma_bk")
      .eq("ma_bk", row.ma_bk)
      .maybeSingle();
    if (findErr) throw findErr;
    // Soft Soft Soft-safe: also match tip short alias (e.g. BM.07.02) to avoid duplicate
    let targetId = existing?.id || null;
    const short = row.ap_dung_jsonb?.seed_meta?.ma_bk_short;
    if (!targetId && short) {
      const { data: byShort } = await supabase
        .from("gstt_dm_bang_kiem")
        .select("id, ma_bk")
        .eq("ma_bk", short)
        .maybeSingle();
      if (byShort?.id) {
        targetId = byShort.id;
        console.log(`alias match ${short} → keep id, set ma_bk=${row.ma_bk}`);
      }
    }
    if (targetId) {
      const { error } = await supabase
        .from("gstt_dm_bang_kiem")
        .update({
          ten_bang_kiem: row.ten_bang_kiem,
          mo_ta: row.mo_ta,
          is_active: true,
          tieu_chi_jsonb: row.tieu_chi_jsonb,
          loai_giam_sat: row.loai_giam_sat,
          cach_tinh_diem: row.cach_tinh_diem,
          doi_tuong_giam_sat: row.doi_tuong_giam_sat,
          phien_ban: row.phien_ban,
          ap_dung_jsonb: row.ap_dung_jsonb,
          ma_bk: row.ma_bk,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("gstt_dm_bang_kiem").insert(row);
      if (error) throw error;
    }
    upserted += 1;
  }
  console.log("Upserted Soft Soft Soft-local:", upserted, "/ 65 BK (0 OUT, WHO skipped)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
