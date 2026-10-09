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
 * GSC-04 (2026-10-05):
 * - Chỉ alias VST BM.07.02/03 — CẤM BM.19.02 (nhật ký MEC ≠ QT.19.BM.02).
 * - Bỏ nhánh «tìm short rồi update chính hàng đó» (tránh đổi tên/ghi đè form).
 * - doi_tuong theo chủ đề; pham_vi nhóm/chuyên khoa → CA_VIEN + KHUYEN_NGH (ids rỗng không ẩn BK).
 *
 * Counts expected: catalog 66 = 1 WHO (VST module, skip gstt) + 65 BK → gstt.
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
const SEED_README = path.join(SEED_DIR, "README.md");

const APPLY = String(process.env.APPLY || "").trim() === "1";
const DRY_RUN = !APPLY;

const WHO_MA = new Set(["KSNK.QT.07.BM.01", "BM.07.01", "VST_WHO"]);

/** Chỉ alias VST hub — không alias nhật ký / form khác chủ đề. */
const SHORT_ALIAS = {
  "KSNK.QT.07.BM.02": "BM.07.02",
  "KSNK.QT.07.BM.03": "BM.07.03",
};

function mapCachTinhDiem(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "TY_LE" || s === "TRON_GOI" || s === "DAT_KHONG_DAT" || s === "NHAT_KY") return s;
  if (s === "DAT_TREN_AP_DUNG") return "TY_LE";
  return "TY_LE";
}

/** GSC-04: không dùng THEO_KHOI/THEO_KHOA khi ids rỗng (ẩn hết BK). */
function mapPhamViLoai(loai, lop) {
  if (lop === "he_thong") return "CHI_KSNK";
  switch (String(loai || "").toLowerCase()) {
    case "toan_vien":
      return "CA_VIEN";
    case "nhom_khoa":
    case "chuyen_khoa":
    case "don_vi_cu_the":
      // Tạm CA_VIEN + nhãn khuyến nghị trong seed_meta (N-GSC-6 chưa có map MDM).
      return "CA_VIEN";
    default:
      return "KHUYEN_NGH";
  }
}

/** GSC-04 / N-GSC-5 — suy đối tượng theo chủ đề. */
function inferDoiTuong(bk, catalogRow) {
  const hay = [bk.ma || catalogRow?.ma_qt_bm, bk.ten || catalogRow?.ten, bk.chuyen_de || catalogRow?.chuyen_de, bk.ghi_chu]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" | ");
  if (/\b(QT\.29|QT\.30|QT\.31|QT\.32|BM\.24|BM\.25|BM\.26|BM\.27)\b|SSI|CLABSI|CAUTI|VAP|bundle/i.test(hay)) {
    return "NGUOI_BENH";
  }
  if (/VSMT|vệ sinh môi trường|đồ vải|QT\.11|BM\.11|QT\.13|BM\.13/i.test(hay)) return "MOI_TRUONG";
  if (/mẻ|tiệt khuẩn|BI\b|QT\.23|QT\.21|BM\.22/i.test(hay)) return "ME_TIET_KHUAN";
  if (/CSSD|dụng cụ|đóng gói|lưu trữ|cấp phát|KKMĐC|QT\.1[89]|QT\.2[0-8]|BM\.1[89]|BM\.2[0-2]/i.test(hay)) {
    return "THIET_BI";
  }
  return "NHAN_VIEN";
}

function buildApDung(bk, catalogRow) {
  const pham = bk.pham_vi_khoa || catalogRow?.pham_vi_khoa || {};
  const lop = bk.lop_giam_sat || catalogRow?.lop_giam_sat || null;
  const pham_vi = mapPhamViLoai(pham.loai, lop);
  const nhomLabel = Array.isArray(pham.nhom) && pham.nhom.length ? `khuyến nghị cho: ${pham.nhom.join(", ")}` : "";
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
    ghi_chu: [pham.ghi_chu || bk.ghi_chu || "", nhomLabel].filter(Boolean).join(" — ").slice(0, 500) || undefined,
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

/** Deterministic UUID (v5-like) — tránh orphan khi APPLY lại cùng nội dung. */
function stableCriterionId(maBk, maTc) {
  const h = crypto.createHash("sha1").update(`gsc-tc:${maBk}:${maTc}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mapTieuChi(bk) {
  const lua = Array.isArray(bk.lua_chon) ? bk.lua_chon : ["DAT", "KHONG_DAT", "KHONG_AP_DUNG"];
  const list = Array.isArray(bk.tieu_chi) ? bk.tieu_chi : [];
  const maBk = String(bk.ma || "").trim();
  return list.map((tc, i) => {
    const stt = Number(tc.stt) || i + 1;
    const ma = String(tc.ma || `TC${String(stt).padStart(2, "0")}`).trim();
    return {
      id: stableCriterionId(maBk, ma),
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

function excludedSection() {
  const md = fs.readFileSync(SEED_README, "utf8");
  const start = md.indexOf("## Excluded index");
  if (start < 0) throw new Error("bang-kiem-seed/README.md thiếu ## Excluded index");
  const rest = md.slice(start);
  const next = rest.indexOf("\n## ", 1);
  return next < 0 ? rest : rest.slice(0, next);
}

function assertZeroOut() {
  const outMas = [...excludedSection().matchAll(/`?(KSNK\.(?:QT|QĐ)\.[0-9]+\.BM\.[0-9]+)`?/g)].map((m) => m[1]);
  return new Set(outMas);
}

function buildRows(catalog) {
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
      doi_tuong_giam_sat: inferDoiTuong(bk, c),
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
  const seedReadme = fs.readFileSync(SEED_README, "utf8");
  console.log("files: catalog + bk=%d who=%d gap=%s", bkFiles.length, whoFiles.length, seedReadme.includes("## Gap vs canonical-36"));
  console.log("mode:", DRY_RUN ? "DRY_RUN (no DB write)" : "APPLY=1 (upsert Soft Soft Soft-local)");
  console.log("SHORT_ALIAS keys:", Object.keys(SHORT_ALIAS).join(", "), "(no BM.19.02)");

  const catalog = loadCatalog();
  const { rows, skippedWho, missingBk, catalogCount } = buildRows(catalog);

  console.log("catalog IN-SCOPE:", catalogCount);
  console.log("WHO skip (VST module, not gstt picker):", skippedWho.length, skippedWho);
  console.log("BK rows ready for gstt_dm_bang_kiem:", rows.length);
  const doiCounts = {};
  for (const r of rows) {
    doiCounts[r.doi_tuong_giam_sat] = (doiCounts[r.doi_tuong_giam_sat] || 0) + 1;
  }
  console.log("doi_tuong_giam_sat:", doiCounts);
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
    console.log("  expect 65 BK; alias match chỉ BM.07.02/03 (không update short row).");
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
    // GSC-04: chỉ khớp đúng ma_bk dài — KHÔNG tìm short rồi rename hàng đó.
    const { data: existing, error: findErr } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("id, ma_bk, tieu_chi_jsonb, phien_ban")
      .eq("ma_bk", row.ma_bk)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing?.id) {
      // Giữ tieu_chi_jsonb nếu đã seed (tránh orphan UUID phiên cũ).
      const keepTc =
        existing.phien_ban === "seed-25d-20260928" && Array.isArray(existing.tieu_chi_jsonb)
          ? existing.tieu_chi_jsonb
          : row.tieu_chi_jsonb;
      const { error } = await supabase
        .from("gstt_dm_bang_kiem")
        .update({
          ten_bang_kiem: row.ten_bang_kiem,
          mo_ta: row.mo_ta,
          is_active: true,
          tieu_chi_jsonb: keepTc,
          loai_giam_sat: row.loai_giam_sat,
          cach_tinh_diem: row.cach_tinh_diem,
          doi_tuong_giam_sat: row.doi_tuong_giam_sat,
          phien_ban: row.phien_ban,
          ap_dung_jsonb: row.ap_dung_jsonb,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("gstt_dm_bang_kiem").insert(row);
      if (error) throw error;
    }
    upserted += 1;
  }
  console.log("Upserted Soft Soft Soft-local:", upserted, "/ 65 BK (0 OUT, WHO skipped; no short-row rename)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
