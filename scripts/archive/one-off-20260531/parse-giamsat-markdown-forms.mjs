#!/usr/bin/env node
/**
 * Parse docs/data/bang-kiem/raw-forms-full.md → seed Phần 3–4 per template (51 ma_bk).
 *
 * Usage: node scripts/parse-giamsat-markdown-forms.mjs
 * Output:
 *   supabase/migrations/20260528000005_gstt_part34_all51_seed.sql
 *   scripts/gsc-part34-parse-report.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SRC_MD = path.join(repoRoot, "docs/data/bang-kiem/raw-forms-full.md");
const SRC_BK = path.join(repoRoot, "docs/data/bang-kiem/master-bangkiem.md");
const SRC_V51 = path.join(repoRoot, "supabase/migrations/20260527000013_seed_master_checklist_v51.sql");
const OUT_SQL = path.join(repoRoot, "supabase/migrations/20260528000005_gstt_part34_all51_seed.sql");
const OUT_REPORT = path.join(repoRoot, "scripts/gsc-part34-parse-report.json");

/** Gán thủ công: substring của normalizeKey(title) → ma_bk */
const TITLE_ALIASES = [
  ["icra", "BM.03.03"],
  ["kythuatvesinhtaythuongquy", "BM.07.02"],
  ["kythuatvesinhtayngoaikhoa", "BM.07.03"],
  ["phuongtienphonghoca nhan", "BM.08.01"],
  ["phuongtienphonghoca nhan", "BM.08.01"],
  ["ppe", "BM.08.01"],
  ["tieman toan", "BM.09.01"],
  ["vatsacnhon", "BM.09.01"],
  ["phoinhiemnghenghiep", "BM.10.01"],
  ["xulyphoinhiem", "BM.10.01"],
  ["duonglaytruyen", "BM.14.01"],
  ["vanchuyennguoibenh", "BM.15.01"],
  ["xulytuthi", "BM.16.01"],
  ["tuthi", "BM.16.01"],
  ["covid", "BM.17.01"],
  ["ebola", "BM.17.01"],
  ["lamsachdungcu", "BM.18.02"],
  ["khukhuandmucdocao", "BM.19.01"],
  ["baoduongdungcuphauthuat", "BM.19.02"],
  ["kiemtrabaoduong", "BM.19.02"],
  ["donggoidungcu", "BM.20.02"],
  ["luutruvacapphat", "BM.21.04"],
  ["tietkhuan", "BM.22.04"],
  ["suds", "BM.QĐ.19.03"],
  ["dungmotlan", "BM.QĐ.19.03"],
  ["clabsi", "BM.25.01"],
  ["duongtruyentinh mach trungtam", "BM.25.01"],
  ["maintenancebundle", "BM.25.03"],
  ["duytri duongtruyen", "BM.25.03"],
  ["an toan dat ongthongtieu", "BM.27.01"],
  ["insertionbundlecauti", "BM.27.01"],
  ["maintenancebundlecauti", "BM.27.01"],
  ["duytri ongthongtieu", "BM.27.01"],
  ["vapbundle", "BM.26.01"],
  ["viemphoitho may", "BM.26.01"],
  ["ssibundle", "BM.24.02"],
  ["vetmo", "BM.24.02"],
  ["vesinhmoitruongbemat", "BM.11.01"],
  ["vsmtbemat", "BM.11.01"],
  ["longapgiuongsuoi", "BM.QĐ.12.01"],
  ["chatluongnuoc", "BM.QĐ.20.01"],
  ["locmay", "BM.QĐ.20.01"],
  ["giatladovai", "BM.13.01"],
  ["chatthaiyte", "BM.12.01"],
  ["aiir", "BM.QĐ.08.01"],
  ["aplycam", "BM.QĐ.08.01"],
  ["phongmo", "BM.QĐ.02.01"],
  ["phauthuat", "BM.QĐ.02.01"],
  ["cathlab", "BM.QĐ.03.01"],
  ["canthiepmach", "BM.QĐ.03.01"],
  ["moitruongbaove", "BM.QĐ.09.01"],
  ["phachethuocvokhuan", "BM.QĐ.17.01"],
  ["antoansinhhoc", "BM.QĐ.16.01"],
  ["xetnghiem", "BM.QĐ.16.01"],
  ["thucpham", "BM.QĐ.18.02"],
  ["bepan", "BM.QĐ.18.02"],
  ["mdro", "BM.31.03"],
];

function inferGsttActCodeFromText(noiDung) {
  const t = String(noiDung || "").toLowerCase();
  if (/stop the line|đình chỉ|dừng hoạt động|dừng mọi hoạt động|dừng thi công/i.test(t)) return "ACT-400";
  if (/biên bản|báo cáo sự cố|bm\.10|tai nạn rủi ro/i.test(t)) return "ACT-500";
  if (/cấp phát|bổ sung.*vật tư|đề xuất cấp|hậu cần|khoa dược/i.test(t)) return "ACT-300";
  if (/coaching|nhắc nhở|hướng dẫn lại/i.test(t)) return "ACT-100";
  return "ACT-200";
}

function stripMd(s) {
  return String(s || "")
    .replace(/\\([_\\[\]()])/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

function normalizeKey(s) {
  return stripMd(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/bảng kiểm/gi, "")
    .replace(/giám sát/gi, "")
    .replace(/tuân thủ/gi, "")
    .replace(/đánh giá/gi, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvLine(line) {
  const parts = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

function loadCatalog() {
  const map = new Map();
  const add = (code, name) => {
    if (!code?.startsWith("BM.")) return;
    map.set(code, { code, name: stripMd(name) });
    map.set(normalizeKey(name), code);
  };

  for (const src of [SRC_BK, SRC_MD]) {
    const raw = readFileSync(src, "utf8");
    for (const line of raw.split(/\n/)) {
      const t = line.trim();
      if (!/^BM\./.test(t)) continue;
      const parts = t.includes(",") ? parseCsvLine(t) : t.split(",");
      if (parts[0]?.startsWith("BM.")) add(parts[0].trim(), parts[1] || parts[0]);
    }
  }

  const v51 = readFileSync(SRC_V51, "utf8");
  const fromInserts = [...v51.matchAll(/insert into public\.gstt_dm_bang_kiem[\s\S]*?\n\s+'([^']+)'/gi)].map(
    (m) => m[1],
  );
  const fromHeaders = [...v51.matchAll(/-- Template #\d+ ([^\s—]+)/g)].map((m) => m[1].trim());
  const uniqueMa = [...new Set([...fromInserts, ...fromHeaders])];
  for (const code of uniqueMa) {
    if (!map.has(code)) map.set(code, { code, name: code });
  }

  return { byCode: map, maList: uniqueMa };
}

function matchMaBk(title, catalog) {
  const key = normalizeKey(title);
  for (const [alias, ma] of TITLE_ALIASES) {
    const a = normalizeKey(alias);
    if (key.includes(a) || a.includes(key.slice(0, Math.min(18, key.length)))) return ma;
  }
  if (catalog.byCode.has(key)) return catalog.byCode.get(key);

  let best = null;
  let bestScore = 0;
  for (const [k, code] of catalog.byCode.entries()) {
    if (!k || k.startsWith("BM.")) continue;
    const a = key.length >= 8 && k.length >= 8;
    if (!a) continue;
    let score = 0;
    if (key.includes(k) || k.includes(key)) score = Math.min(key.length, k.length);
    else {
      const words = k.match(/.{4,}/g) || [];
      score = words.filter((w) => key.includes(w)).length * 4;
    }
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return bestScore >= 8 ? best : null;
}

function parseReasonLine(line) {
  const m = line.match(/\[(\d{3})-(SYS|HUM|CLI)\]/i);
  if (!m) return null;
  const code = `${m[1]}_${m[2].toUpperCase()}`;
  let text = stripMd(line);
  text = text.replace(/^\[\s*\\?\]?\s*\]?\s*/i, "");
  text = text.replace(/\[(\d{3})-(SYS|HUM|CLI)\]/gi, "").trim();
  const colon = text.indexOf(":");
  const moTa = colon >= 0 ? text.slice(colon + 1).trim() : text;
  let ten = colon >= 0 ? text.slice(0, colon).trim() : moTa;
  ten = ten.replace(/^\*\s*\[\s*\]\s*/i, "").trim();
  return { code, ten_hien_thi: ten, mo_ta: moTa };
}

function parseActionLine(line) {
  let text = stripMd(line);
  text = text.replace(/^\*\s*/, "");
  text = text.replace(/^\[\s*\\?\]?\s*\]?\s*/i, "").trim();
  if (!text || text.length < 6) return null;
  const action_code = inferGsttActCodeFromText(text);
  return {
    noi_dung: text,
    action_code,
    la_stop_the_line: action_code === "ACT-400",
  };
}

function parseMarkdownForms(catalog) {
  const raw = readFileSync(SRC_MD, "utf8");
  const globalReasons = new Map();
  const blocks = raw.split(/\n\\?-{10,}\n/);
  const byMa = new Map();

  for (const block of blocks) {
    const titleMatch = block.match(/\*\*BẢNG KIỂM[^\n*]+/i);
    if (!titleMatch) continue;
    const title = stripMd(titleMatch[0]);
    const ma_bk = matchMaBk(title, catalog);
    if (!ma_bk) continue;

    const p3 = block.split(/\*\*PHẦN 3/i)[1];
    const p4 = block.split(/\*\*PHẦN 4/i)[1];
    const reasons = [];
    const actions = [];

    if (p3) {
      const p3body = p3.split(/\*\*PHẦN 4/i)[0] || p3;
      for (const line of p3body.split("\n")) {
        const cleaned = stripMd(line);
        if (!/\[(\d{3})-(SYS|HUM|CLI)\]/i.test(cleaned)) continue;
        const r = parseReasonLine(cleaned);
        if (r) {
          reasons.push(r);
          if (!globalReasons.has(r.code)) globalReasons.set(r.code, r);
        }
      }
    }

    if (p4) {
      const p4body = (p4.split(/\*\*Chữ ký/i)[0] || p4).split(/\n---/)[0];
      let stt = 0;
      for (const line of p4body.split("\n")) {
        const cleaned = stripMd(line);
        if (!cleaned.startsWith("*") && !/^\[\s*\\?\]?\s*\]?\s*/.test(line.trim())) continue;
        const a = parseActionLine(cleaned.startsWith("*") ? cleaned : line);
        if (a) {
          stt += 1;
          actions.push({ stt, ...a });
        }
      }
    }

    const prev = byMa.get(ma_bk);
    if (prev) {
      const reasonMap = new Map(prev.reasons.map((r) => [r.code, r]));
      for (const r of reasons) reasonMap.set(r.code, r);
      const actionTexts = new Set(prev.actions.map((a) => a.noi_dung));
      const mergedActions = [...prev.actions];
      for (const a of actions) {
        if (!actionTexts.has(a.noi_dung)) {
          mergedActions.push({ ...a, stt: mergedActions.length + 1 });
          actionTexts.add(a.noi_dung);
        }
      }
      byMa.set(ma_bk, {
        ma_bk,
        title: prev.title,
        reasons: [...reasonMap.values()],
        actions: mergedActions,
      });
    } else {
      byMa.set(ma_bk, { ma_bk, title, reasons, actions });
    }
  }

  return { forms: [...byMa.values()], globalReasons };
}

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJsonb(obj) {
  return `$jsonb$${JSON.stringify(obj)}$jsonb$::jsonb`;
}

function emitTemplateUpdate(lines, f) {
  const allowEntries = f.reasons.map((r, i) => ({
    lookup_code: r.code,
    ten_hien_thi: r.ten_hien_thi,
    mo_ta_chi_tiet: r.mo_ta,
    thu_tu_hien_thi: i + 1,
  }));
  if (allowEntries.length === 0 && f.actions.length === 0) return false;

  lines.push(`-- ${f.ma_bk}: ${f.title.slice(0, 80)}`);
  lines.push(`update public.gstt_dm_bang_kiem bk set`);
  if (f.actions.length > 0) {
    lines.push(`  hanh_dong_khac_phuc_jsonb = ${sqlJsonb(f.actions)},`);
  }
  if (allowEntries.length > 0) {
    lines.push(`  nguyen_nhan_cho_phep_jsonb = coalesce(`);
    lines.push(`    (select jsonb_agg(`);
    lines.push(`      jsonb_build_object(`);
    lines.push(`        'lookup_id', l.id::text,`);
    lines.push(`        'lookup_code', l.code,`);
    lines.push(`        'ten_hien_thi', coalesce(e->>'ten_hien_thi', l.name),`);
    lines.push(`        'mo_ta_chi_tiet', coalesce(e->>'mo_ta_chi_tiet', l.description),`);
    lines.push(`        'thu_tu_hien_thi', (e->>'thu_tu_hien_thi')::int`);
    lines.push(`      ) order by (e->>'thu_tu_hien_thi')::int`);
    lines.push(`    ) from jsonb_array_elements(${sqlJsonb(allowEntries)}) e`);
    lines.push(`    join public.sys_lookup_value l on l.category_type = 'NGUYEN_NHAN_LOI' and l.code = e->>'lookup_code')`);
    lines.push(`    , '[]'::jsonb)`);
  }
  lines.push(`where bk.ma_bk = ${sqlStr(f.ma_bk)};`);
  lines.push("");
  return true;
}

function main() {
  const catalog = loadCatalog();
  const { forms, globalReasons } = parseMarkdownForms(catalog);
  const formByMa = new Map(forms.map((f) => [f.ma_bk, f]));

  const lines = [];
  lines.push("-- 20260528000005_gstt_part34_all51_seed.sql");
  lines.push("-- Generated by scripts/parse-giamsat-markdown-forms.mjs");
  lines.push(`-- Forms parsed from doc: ${forms.length}, catalog ma_bk: ${catalog.maList.length}`);
  lines.push("begin;");
  lines.push("");

  let updateCount = 0;
  for (const ma_bk of catalog.maList) {
    const f = formByMa.get(ma_bk);
    if (f && emitTemplateUpdate(lines, f)) updateCount += 1;
  }

  lines.push("-- Bổ sung lookup mô tả theo ngữ cảnh doc (canonical name giữ sys_lookup_value.name)");
  for (const [code, r] of globalReasons) {
    const nhom = code.endsWith("_SYS") ? "HE_THONG" : code.endsWith("_HUM") ? "CON_NGUOI" : "LAM_SANG";
    const meta = JSON.stringify({ nhom_loi: nhom, ma_jci: code.replace("_", "-") });
    lines.push(
      `insert into public.sys_lookup_value (category_type, code, name, description, is_active, metadata)`,
    );
    lines.push(
      `values ('NGUYEN_NHAN_LOI', ${sqlStr(code)}, ${sqlStr(r.ten_hien_thi)}, ${sqlStr(r.mo_ta)}, true, ${sqlStr(meta)}::jsonb)`,
    );
    lines.push(
      `on conflict (category_type, code) do update set description = coalesce(excluded.description, sys_lookup_value.description), metadata = excluded.metadata, is_active = true;`,
    );
  }
  lines.push("");
  lines.push("commit;");

  writeFileSync(OUT_SQL, lines.join("\n"), "utf8");

  const unmatchedTitles = forms.filter((f) => !catalog.maList.includes(f.ma_bk));
  const missingFromDoc = catalog.maList.filter((m) => !formByMa.has(m));
  const report = {
    parsedForms: forms.length,
    sqlUpdates: updateCount,
    catalogSize: catalog.maList.length,
    missingFromDoc,
    forms: forms.map((f) => ({
      ma_bk: f.ma_bk,
      title: f.title,
      reasonCount: f.reasons.length,
      actionCount: f.actions.length,
    })),
  };
  writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), "utf8");

  console.log(`Wrote ${OUT_SQL}`);
  console.log(`Updates: ${updateCount}/${catalog.maList.length}, parsed forms: ${forms.length}`);
  console.log(`Missing doc content (${missingFromDoc.length}):`, missingFromDoc.join(", "));
  console.log(`Report: ${OUT_REPORT}`);
}

main();
